import { armarKit, leerPerfil, validarMarca } from './bloqueo';
import { MENSAJES, mandarMensaje, mandarSmsBloqueo, proveedores, type EnvMensajes, type Mensaje as MensajeWhatsApp } from './mensajes';
import {
  JUNTAR_GRABACIONES_GRADOS,
  JUNTAR_GRABACIONES_MS,
  MAX_EVIDENCIA_BYTES,
  MAX_EVIDENCIAS_POR_HORA,
  MAX_REPORTES_POR_HORA,
  VENTANA_REPORTES_MS,
  cajaDe,
  redondear,
  validarBusqueda,
  validarEvidencia,
  validarMiniatura,
  validarReporte,
} from './comunidad';
import { ErrorDeDatos, enmascarar, validarMensaje, type Contacto, type Mensaje, type Punto } from './validar';

/**
 * Backend de Alerta Arrebato en Cloudflare Workers + D1. Una sola URL pública con HTTPS:
 * - `POST /api/eventos`: lo que manda la app (contrato en docs/PLAN.md §6.1).
 * - `GET  /api/alertas/:id`: lo que ve el contacto en `/a/:id` (sin teléfonos).
 * - `POST /api/alertas/:id/encargado`: "Yo me encargo" (avisa al resto de la red).
 * - `POST /api/alertas/:id/robo`: el contacto confirma que SÍ fue un robo; la página muestra el kit de bloqueo.
 * - `POST /api/alertas/:id/bloqueo`: marca un paso del kit como hecho (lo ve toda la red).
 * - `GET  /api/reportes?lat=&lon=&radioKm=` y `POST /api/reportes`: "Cerca de ti" (reportes de la comunidad).
 * - `POST /api/evidencias` y `GET /api/evidencias/:id`: video o audio guardado en R2. Si trae ubicación, se publica
 *   en "Cerca de ti" (cuelga de un reporte del mapa).
 * - `POST/GET /api/evidencias/:id/miniatura`: un cuadro del video (JPEG) para la tarjeta del mapa.
 * - `GET  /api/salud`: si la base y Zavu están listos.
 * - Todo lo demás: la web de la app (export de Expo en apps/movil/dist).
 */

export interface Env extends EnvMensajes {
  DB: D1Database;
  ASSETS: Fetcher;
  /** Bucket R2 `alerta-arrebato-evidencias`. */
  EVIDENCIAS: R2Bucket;
}

const MAX_CUERPO = 128 * 1024;
/** Una alerta "abierta" recibe ubicaciones durante 30 min; después la ruta se cierra. */
const ALERTA_ABIERTA_MS = 30 * 60_000;
/** Los teléfonos de la red se borran a las 24 h. */
const RETENCION_CONTACTOS_MS = 24 * 3600_000;

/** Margen sobre la espera del celular: si en ese tiempo no llegó `notificar_familia` ni `cancelada`, avisa el servidor. */
const MARGEN_SERVIDOR_MS = 6000;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Dispositivo, X-Lat, X-Lon, Range',
  'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges',
};

function json(datos: unknown, estado = 200): Response {
  return new Response(JSON.stringify(datos), { status: estado, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...CORS } });
}

/** Token del enlace público: 16 caracteres aleatorios (80 bits), imposible de adivinar. */
function nuevoId(): string {
  const letras = 'abcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => letras[b % letras.length]).join('');
}

interface FilaAlerta {
  id: string;
  dispositivo: string;
  nombre: string;
  estado: 'en_espera' | 'avisada' | 'robo_confirmado' | 'cancelada';
  prueba: number;
  via: string | null;
  confianza: string | null;
  velocidad_ms: number | null;
  t_jalon: number | null;
  lat_jalon: number | null;
  lon_jalon: number | null;
  contactos_json: string | null;
  encargado: string | null;
  bloqueo_json: string | null;
  robo_confirmado_por: string | null;
  robo_confirmado: number | null;
  espera_s: number | null;
  origen: string | null;
  creada: number;
  avisada: number | null;
  cancelada: number | null;
}

/** Cuerpo JSON chico (los botones de la página del contacto). `null` si es inválido o pasa de 4 KB. */
async function leerJson(peticion: Request): Promise<unknown> {
  if (Number(peticion.headers.get('Content-Length') ?? 0) > 4096) return null;
  const texto = await peticion.text().catch(() => '');
  if (texto.length > 4096) return null;
  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
}

function contactosDe(fila: FilaAlerta): Contacto[] {
  try {
    return fila.contactos_json ? (JSON.parse(fila.contactos_json) as Contacto[]) : [];
  } catch {
    return [];
  }
}

async function alertaAbierta(env: Env, dispositivo: string, ahora: number): Promise<FilaAlerta | null> {
  return env.DB.prepare(`SELECT * FROM alertas WHERE dispositivo = ? AND prueba = 0 AND estado != 'cancelada' AND creada > ? ORDER BY creada DESC LIMIT 1`)
    .bind(dispositivo, ahora - ALERTA_ABIERTA_MS)
    .first<FilaAlerta>();
}

/**
 * Para cancelar con el PIN: la alerta abierta o, si ya pasaron los 30 min, una con el robo confirmado en las
 * últimas 24 h. Así la dueña siempre puede anular una confirmación (y borrar sus datos del kit) mientras existan.
 */
async function alertaParaCancelar(env: Env, dispositivo: string, ahora: number): Promise<FilaAlerta | null> {
  return (
    (await alertaAbierta(env, dispositivo, ahora)) ??
    (await env.DB.prepare(`SELECT * FROM alertas WHERE dispositivo = ? AND prueba = 0 AND estado = 'robo_confirmado' AND creada > ? ORDER BY creada DESC LIMIT 1`)
      .bind(dispositivo, ahora - RETENCION_CONTACTOS_MS)
      .first<FilaAlerta>())
  );
}

function guardarPuntos(env: Env, alertaId: string, puntos: Punto[]): D1PreparedStatement[] {
  return puntos.map((p) =>
    env.DB.prepare('INSERT OR IGNORE INTO ubicaciones (alerta_id, t, lat, lon, velocidad, precision) VALUES (?, ?, ?, ?, ?, ?)').bind(
      alertaId,
      Math.round(p.t),
      p.lat,
      p.lon,
      p.velocidad,
      p.precision,
    ),
  );
}

/** Manda un mensaje a cada contacto y lo registra (con el destino enmascarado). Devuelve cuántos salieron. */
async function avisar(
  env: Env,
  alertaId: string,
  tipo: string,
  destinos: Array<{ contacto: Contacto; mensaje: MensajeWhatsApp }>,
): Promise<{ avisados: number; detalle: string }> {
  const resultados = await Promise.all(
    destinos.map((d, i) => mandarMensaje(env, { telefono: d.contacto.telefono, mensaje: d.mensaje, idempotencia: `${alertaId}-${tipo}-${i}` })),
  );
  const ahora = Date.now();
  if (destinos.length > 0) {
    await env.DB.batch(
      resultados.map((r, i) =>
        env.DB.prepare('INSERT INTO envios (alerta_id, tipo, destino, canal, ok, detalle, creado) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(
          alertaId,
          tipo,
          enmascarar(destinos[i].contacto.telefono),
          r.canal,
          r.ok ? 1 : 0,
          r.detalle,
          ahora,
        ),
      ),
    );
  }
  const avisados = resultados.filter((r) => r.ok).length;
  const fallo = resultados.find((r) => !r.ok);
  const detalle =
    destinos.length === 0 ? 'no hay contactos con teléfono' : avisados === destinos.length ? 'enviado' : `${avisados} de ${destinos.length} avisados${fallo ? `: ${fallo.detalle}` : ''}`;
  return { avisados, detalle };
}

/**
 * Avisa a la red una sola vez por alerta, la pida la app (`notificar_familia`) o la cuenta del servidor.
 * Marca la alerta como avisada ANTES de mandar (con una condición en el UPDATE), así dos caminos a la vez
 * no mandan el mensaje dos veces.
 */
async function avisarFamilia(env: Env, fila: FilaAlerta, origen: string): Promise<{ avisados: number; total: number; detalle: string }> {
  const contactos = contactosDe(fila);
  const ahora = Date.now();
  const marcada = await env.DB.prepare(`UPDATE alertas SET estado = 'avisada', avisada = ?, contactos_json = ?, actualizada = ? WHERE id = ? AND estado = 'en_espera'`)
    .bind(ahora, fila.contactos_json, ahora, fila.id)
    .run();
  if (!marcada.meta.changes) {
    // Ya la avisó el otro camino: devolvemos lo que pasó entonces.
    const previo = await env.DB.prepare(`SELECT COUNT(*) AS total, SUM(ok) AS avisados, MAX(detalle) AS detalle FROM envios WHERE alerta_id = ? AND tipo = 'alerta'`)
      .bind(fila.id)
      .first<{ total: number; avisados: number | null; detalle: string | null }>();
    const avisados = previo?.avisados ?? 0;
    return { avisados, total: contactos.length, detalle: avisados === contactos.length ? 'enviado' : `${avisados} de ${contactos.length} avisados: ${previo?.detalle ?? ''}` };
  }
  await reportarDesdeAlerta(env, fila, ahora);
  const tJalon = fila.t_jalon ?? fila.creada;
  const r = await avisar(
    env,
    fila.id,
    'alerta',
    contactos.map((c, i) => ({
      contacto: c,
      mensaje: MENSAJES.alerta(fila.nombre, tJalon, enlace(origen, fila.id, i)),
    })),
  );
  return { avisados: r.avisados, total: contactos.length, detalle: r.detalle };
}

/**
 * Una alerta avisada también aparece en "Cerca de ti", anónima: sin nombre, sin dispositivo a la vista y
 * con la ubicación del jalón redondeada a ~100 m. Si después se cancela (era falsa alarma), se borra.
 */
async function reportarDesdeAlerta(env: Env, fila: FilaAlerta, ahora: number): Promise<void> {
  if (fila.prueba || fila.lat_jalon === null || fila.lon_jalon === null) return;
  try {
    await env.DB.prepare(
      `INSERT INTO reportes (id, tipo, lat, lon, nota, dispositivo, origen, alerta_id, creado) VALUES (?, 'arrebato_moto', ?, ?, NULL, ?, 'alerta', ?, ?)`,
    )
      .bind(nuevoId(), redondear(fila.lat_jalon), redondear(fila.lon_jalon), fila.dispositivo, fila.id, ahora)
      .run();
  } catch (e) {
    // El aviso a la red importa más que el mapa: si esto falla, lo registramos y seguimos.
    console.error('No se pudo crear el reporte de la alerta', e);
  }
}

/** Alertas cuya espera venció sin que el celular avisara ni cancelara: avisa el servidor. */
async function avisarVencidas(env: Env): Promise<void> {
  const ahora = Date.now();
  const { results } = await env.DB.prepare(
    `SELECT * FROM alertas WHERE estado = 'en_espera' AND prueba = 0 AND espera_s IS NOT NULL AND creada + espera_s * 1000 + ? <= ? AND creada > ?`,
  )
    .bind(MARGEN_SERVIDOR_MS, ahora, ahora - ALERTA_ABIERTA_MS)
    .all<FilaAlerta>();
  for (const fila of results) {
    // Una alerta que falla no frena a las demás.
    try {
      await avisarFamilia(env, fila, fila.origen ?? '');
    } catch (e) {
      console.error('No se pudo avisar la alerta vencida', fila.id, e);
    }
  }
}

/** El enlace que recibe cada contacto: `?c=<n>` dice quién es, para "Yo me encargo". */
function enlace(origen: string, id: string, indice?: number): string {
  return `${origen}/a/${id}${indice === undefined ? '' : `?c=${indice}`}`;
}

async function procesar(env: Env, ctx: ExecutionContext, m: Mensaje, origen: string): Promise<Response> {
  const ahora = Date.now();
  switch (m.tipo) {
    case 'alerta': {
      // iPhone: lo PRIMERO es el SMS a la propia dueña, que dispara "Bloquear pantalla" en Atajos. No espera
      // a la base de datos ni a la cuenta: si el ladrón lo tiene desbloqueado en la mano, cada segundo cuenta.
      const id = nuevoId();
      const smsBloqueo = m.numeroPropio ? mandarSmsBloqueo(env, m.numeroPropio, `${id}-bloqueo`) : null;
      // Que el Worker no lo corte aunque falle lo de abajo.
      if (smsBloqueo) ctx.waitUntil(smsBloqueo);
      // Al panel, en silencio: la red todavía NO se avisa (el dueño tiene unos segundos para cancelar).
      const p = m.evento.posicionJalon ?? m.ruta[m.ruta.length - 1] ?? null;
      await env.DB.batch([
        env.DB.prepare(
          `INSERT INTO alertas (id, dispositivo, nombre, estado, via, confianza, velocidad_ms, t_jalon, lat_jalon, lon_jalon, contactos_json, bloqueo_json, espera_s, origen, creada, actualizada)
           VALUES (?, ?, ?, 'en_espera', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).bind(
          id,
          m.dispositivo,
          m.nombre,
          m.evento.via,
          m.evento.confianza,
          m.evento.velocidadMs,
          m.evento.tJalon,
          p?.lat ?? null,
          p?.lon ?? null,
          JSON.stringify(m.contactos),
          m.bloqueo ? JSON.stringify(m.bloqueo) : null,
          m.esperaS,
          origen,
          ahora,
          ahora,
        ),
        ...guardarPuntos(env, id, m.ruta),
      ]);
      if (smsBloqueo && m.numeroPropio) {
        const numero = m.numeroPropio;
        ctx.waitUntil(
          smsBloqueo.then((r) =>
            env.DB.prepare('INSERT INTO envios (alerta_id, tipo, destino, canal, ok, detalle, creado) VALUES (?, ?, ?, ?, ?, ?, ?)')
              .bind(id, 'bloqueo_iphone', enmascarar(numero), r.canal, r.ok ? 1 : 0, r.detalle, Date.now())
              .run(),
          ),
        );
      }
      // La cuenta del servidor: si el celular se apaga o se queda sin señal, igual se avisa a la red.
      ctx.waitUntil(
        new Promise((listo) => setTimeout(listo, m.esperaS * 1000 + MARGEN_SERVIDOR_MS)).then(() => avisarVencidas(env)),
      );
      return json({ ok: true, id, enlace: enlace(origen, id), detalle: 'en el panel' });
    }
    case 'notificar_familia': {
      let fila = await alertaAbierta(env, m.dispositivo, ahora);
      // Una alerta anterior (de otro jalón) que ya se avisó no sirve: este jalón es otro incidente.
      if (fila && fila.estado !== 'en_espera' && fila.t_jalon !== m.evento.tJalon) fila = null;
      if (!fila) {
        // La `alerta` no llegó (sin señal en ese momento): la creamos ahora para no perder el aviso.
        const id = nuevoId();
        const p = m.evento.posicionJalon;
        await env.DB.prepare(
          `INSERT INTO alertas (id, dispositivo, nombre, estado, via, confianza, velocidad_ms, t_jalon, lat_jalon, lon_jalon, contactos_json, bloqueo_json, creada, actualizada)
           VALUES (?, ?, ?, 'en_espera', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
          .bind(
            id,
            m.dispositivo,
            m.nombre,
            m.evento.via,
            m.evento.confianza,
            m.evento.velocidadMs,
            m.evento.tJalon,
            p?.lat ?? null,
            p?.lon ?? null,
            JSON.stringify(m.contactos),
            m.bloqueo ? JSON.stringify(m.bloqueo) : null,
            ahora,
            ahora,
          )
          .run();
        fila = await env.DB.prepare('SELECT * FROM alertas WHERE id = ?').bind(id).first<FilaAlerta>();
        if (!fila) return json({ ok: false, detalle: 'no se pudo guardar la alerta' }, 500);
      }
      if (m.contactos.length) fila.contactos_json = JSON.stringify(m.contactos);
      // Si la `alerta` llegó sin el perfil de bloqueo (se perdió ese envío o la dueña lo llenó en esos segundos), lo completamos.
      if (m.bloqueo && !fila.bloqueo_json) {
        await env.DB.prepare('UPDATE alertas SET bloqueo_json = ? WHERE id = ?').bind(JSON.stringify(m.bloqueo), fila.id).run();
      }
      const r = await avisarFamilia(env, fila, origen);
      return json({ ok: true, id: fila.id, enlace: enlace(origen, fila.id), ...r });
    }
    case 'ubicacion': {
      const fila = await alertaAbierta(env, m.dispositivo, ahora);
      if (!fila) return json({ ok: false, detalle: 'no hay una alerta abierta' }, 404);
      await env.DB.batch([...guardarPuntos(env, fila.id, [m.lectura]), env.DB.prepare('UPDATE alertas SET actualizada = ? WHERE id = ?').bind(ahora, fila.id)]);
      return json({ ok: true, id: fila.id });
    }
    case 'cancelada': {
      const fila = await alertaParaCancelar(env, m.dispositivo, ahora);
      if (!fila) return json({ ok: true, detalle: 'no había una alerta abierta' });
      // Primero la cancelamos SOLO si sigue en espera (con condición en el UPDATE): si el servidor la estaba
      // avisando en ese mismo instante, la red ya recibió la alerta y también tiene que recibir el "está bien".
      const seguiaEnEspera = await env.DB.prepare(`UPDATE alertas SET estado = 'cancelada', cancelada = ?, actualizada = ? WHERE id = ? AND estado = 'en_espera'`)
        .bind(ahora, ahora, fila.id)
        .run();
      // Si la red ya había sido avisada (o hasta confirmó el robo), le decimos que está bien. Después borramos
      // sus teléfonos y el perfil de bloqueo.
      const r =
        !seguiaEnEspera.meta.changes
          ? await avisar(env, fila.id, 'esta_bien', contactosDe(fila).map((c) => ({ contacto: c, mensaje: MENSAJES.estaBien(fila.nombre) })))
          : { avisados: 0, detalle: 'la red no había sido avisada' };
      await env.DB.batch([
        env.DB.prepare(`UPDATE alertas SET estado = 'cancelada', cancelada = ?, contactos_json = NULL, bloqueo_json = NULL, actualizada = ? WHERE id = ?`).bind(ahora, ahora, fila.id),
        env.DB.prepare('DELETE FROM bloqueos WHERE alerta_id = ?').bind(fila.id),
        // Era falsa alarma: sale de "Cerca de ti".
        env.DB.prepare(`DELETE FROM reportes WHERE alerta_id = ? AND origen = 'alerta'`).bind(fila.id),
      ]);
      return json({ ok: true, id: fila.id, avisados: r.avisados, detalle: r.detalle });
    }
    case 'prueba': {
      // La prueba guiada: un mensaje marcado como PRUEBA con un enlace a la vista de ejemplo.
      const id = nuevoId();
      await env.DB.prepare(`INSERT INTO alertas (id, dispositivo, nombre, estado, prueba, creada, actualizada) VALUES (?, ?, ?, 'cancelada', 1, ?, ?)`)
        .bind(id, m.dispositivo, m.nombre, ahora, ahora)
        .run();
      const r = await avisar(env, id, 'prueba', m.contactos.map((c) => ({ contacto: c, mensaje: MENSAJES.prueba(m.nombre, `${origen}/a/ejemplo`) })));
      return json({ ok: r.avisados > 0 || m.contactos.length === 0, avisados: r.avisados, total: m.contactos.length, detalle: r.detalle });
    }
    case 'probar_bloqueo': {
      // Botón "Probar" de la guía de Atajos: el mismo SMS, para comprobar que el iPhone se bloquea.
      const r = await mandarSmsBloqueo(env, m.numeroPropio, `prueba-bloqueo-${m.dispositivo}-${ahora}`);
      return json({ ok: r.ok, detalle: r.ok ? 'SMS enviado' : r.detalle }, r.ok ? 200 : 502);
    }
    case 'motivo_falsa_alarma':
      await env.DB.prepare('INSERT INTO motivos (dispositivo, motivo, creado) VALUES (?, ?, ?)').bind(m.dispositivo, m.motivo, ahora).run();
      return json({ ok: true });
  }
}

/** Lo que ve el contacto. Nunca devuelve los teléfonos de la red; la línea de la dueña, solo en el kit (tras confirmar el robo). */
async function verAlerta(env: Env, id: string, origen: string): Promise<Response> {
  const fila = await env.DB.prepare('SELECT * FROM alertas WHERE id = ? AND prueba = 0').bind(id).first<FilaAlerta>();
  if (!fila) return json({ ok: false, detalle: 'no existe esa alerta' }, 404);
  // La página lo pide cada 2 s: las tres lecturas van a la vez.
  const [{ results }, evidencias, kit] = await Promise.all([
    env.DB.prepare('SELECT t, lat, lon, velocidad, precision FROM ubicaciones WHERE alerta_id = ? ORDER BY t DESC LIMIT 600').bind(id).all<Punto>(),
    env.DB.prepare('SELECT id, tipo FROM evidencias WHERE alerta_id = ? ORDER BY creado ASC LIMIT 20').bind(id).all<{ id: string; tipo: string }>(),
    kitPublico(env, fila),
  ]);
  return json({
    ...kit,
    ok: true,
    id: fila.id,
    nombre: fila.nombre,
    estado: fila.estado,
    via: fila.via,
    velocidadMs: fila.velocidad_ms,
    tJalon: fila.t_jalon,
    jalon: fila.lat_jalon !== null && fila.lon_jalon !== null ? { lat: fila.lat_jalon, lon: fila.lon_jalon } : null,
    ruta: results.reverse(),
    evidencias: evidencias.results.map((e) => ({ id: e.id, tipo: e.tipo, enlace: `${origen}/api/evidencias/${e.id}` })),
    encargado: fila.encargado,
    roboConfirmadoPor: fila.robo_confirmado_por,
    roboConfirmado: fila.robo_confirmado,
    avisada: fila.avisada,
    cancelada: fila.cancelada,
    ahora: Date.now(),
  });
}

async function marcarEncargado(env: Env, id: string, peticion: Request, origen: string): Promise<Response> {
  const fila = await env.DB.prepare('SELECT * FROM alertas WHERE id = ? AND prueba = 0').bind(id).first<FilaAlerta>();
  if (!fila) return json({ ok: false, detalle: 'no existe esa alerta' }, 404);
  if (fila.encargado) return json({ ok: true, encargado: fila.encargado, detalle: 'ya había alguien a cargo' });
  const cuerpo = ((await leerJson(peticion)) ?? {}) as { contacto?: unknown };
  const contactos = contactosDe(fila);
  const indice = typeof cuerpo.contacto === 'number' && Number.isInteger(cuerpo.contacto) ? cuerpo.contacto : -1;
  // "Yo me encargo" no exige enlace personal (solo avisa al resto); confirmar el robo y marcar pasos sí.
  const quien = quienEs(fila, cuerpo.contacto) ?? 'Alguien de tu red';
  // Con condición: si dos personas tocan "Yo me encargo" a la vez, solo una avisa al resto.
  const tomada = await env.DB.prepare('UPDATE alertas SET encargado = ?, actualizada = ? WHERE id = ? AND encargado IS NULL').bind(quien, Date.now(), id).run();
  if (!tomada.meta.changes) return json({ ok: true, detalle: 'ya había alguien a cargo' });
  const resto = contactos.map((c, i) => ({ c, i })).filter((x) => x.i !== indice);
  const r = await avisar(env, id, 'encargado', resto.map((x) => ({ contacto: x.c, mensaje: MENSAJES.encargado(quien, fila.nombre, enlace(origen, id, x.i)) })));
  return json({ ok: true, encargado: quien, avisados: r.avisados, detalle: r.detalle });
}

/**
 * Quién de la red hizo algo, según el `?c=<n>` de su enlace. `null` si el índice no corresponde a ningún
 * contacto: confirmar el robo y marcar pasos exige venir de un enlace personal (no del enlace reenviado sin `?c=`).
 */
function quienEs(fila: FilaAlerta, contacto: unknown): string | null {
  const indice = typeof contacto === 'number' && Number.isInteger(contacto) ? contacto : -1;
  return contactosDe(fila)[indice]?.nombre ?? null;
}

const SIN_CONTACTO = 'abre el enlace que te llegó por WhatsApp o SMS: este enlace no dice quién eres';

/**
 * El kit de bloqueo con los datos de la dueña (línea, IMEI, DNI). Solo existe DESPUÉS de que un contacto
 * confirmó el robo: antes, la página no muestra ningún dato personal.
 */
async function kitPublico(env: Env, fila: FilaAlerta): Promise<{ kit: unknown }> {
  if (fila.estado !== 'robo_confirmado') return { kit: null };
  const perfil = leerPerfil(fila.bloqueo_json);
  const { results } = await env.DB.prepare('SELECT paso, quien, hecho, actualizado FROM bloqueos WHERE alerta_id = ?')
    .bind(fila.id)
    .all<{ paso: string; quien: string; hecho: number; actualizado: number }>();
  const marcas = new Map(results.map((r) => [r.paso, r]));
  return {
    kit: {
      pasos: armarKit(perfil, fila.nombre).map((p) => {
        const m = marcas.get(p.paso);
        return { ...p, hecho: Boolean(m?.hecho), quien: m?.hecho ? m.quien : null, hechoEn: m?.hecho ? m.actualizado : null };
      }),
      // Pasadas las 24 h el backend borró el perfil: lo decimos (`null`) en vez de mostrar campos vacíos.
      datos: Date.now() - fila.creada > RETENCION_CONTACTOS_MS ? null : { linea: perfil?.linea ?? null, imei: perfil?.imei ?? null, dni: perfil?.dni ?? null },
    },
  };
}

/** "Sí, fue un robo": solo desde una alerta ya avisada a la red. Si la dueña mete su PIN después, vuelve a falsa alarma. */
async function confirmarRobo(env: Env, id: string, peticion: Request): Promise<Response> {
  const fila = await env.DB.prepare('SELECT * FROM alertas WHERE id = ? AND prueba = 0').bind(id).first<FilaAlerta>();
  if (!fila) return json({ ok: false, detalle: 'no existe esa alerta' }, 404);
  if (fila.estado === 'robo_confirmado') return json({ ok: true, roboConfirmadoPor: fila.robo_confirmado_por, detalle: 'ya estaba confirmado' });
  if (fila.estado !== 'avisada') {
    return json({ ok: false, detalle: fila.estado === 'cancelada' ? `${fila.nombre} confirmó que fue falsa alarma` : 'la alerta todavía no se avisó a la red' }, 409);
  }
  const cuerpo = ((await leerJson(peticion)) ?? {}) as { contacto?: unknown };
  const quien = quienEs(fila, cuerpo.contacto);
  if (!quien) return json({ ok: false, detalle: SIN_CONTACTO }, 403);
  const ahora = Date.now();
  // La condición en el UPDATE evita pisar una cancelación que llegó al mismo tiempo.
  const r = await env.DB.prepare(`UPDATE alertas SET estado = 'robo_confirmado', robo_confirmado_por = ?, robo_confirmado = ?, actualizada = ? WHERE id = ? AND estado = 'avisada'`)
    .bind(quien, ahora, ahora, id)
    .run();
  if (!r.meta.changes) return json({ ok: false, detalle: 'la alerta cambió mientras confirmabas; recarga la página' }, 409);
  return json({ ok: true, roboConfirmadoPor: quien });
}

/** Marca (o desmarca) un paso del kit. Lo ve toda la red en la misma página. */
async function marcarPasoBloqueo(env: Env, id: string, peticion: Request): Promise<Response> {
  const fila = await env.DB.prepare('SELECT * FROM alertas WHERE id = ? AND prueba = 0').bind(id).first<FilaAlerta>();
  if (!fila) return json({ ok: false, detalle: 'no existe esa alerta' }, 404);
  if (fila.estado !== 'robo_confirmado') return json({ ok: false, detalle: 'primero hay que confirmar el robo' }, 409);
  const marca = validarMarca(await leerJson(peticion));
  if (!marca) return json({ ok: false, detalle: 'paso desconocido' }, 400);
  const quien = quienEs(fila, marca.contacto);
  if (!quien) return json({ ok: false, detalle: SIN_CONTACTO }, 403);
  // Solo si la alerta SIGUE confirmada: si la dueña canceló en este instante, no queda una fila suelta.
  const r = await env.DB.prepare(
    `INSERT INTO bloqueos (alerta_id, paso, quien, hecho, actualizado)
     SELECT ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM alertas WHERE id = ? AND estado = 'robo_confirmado')
     ON CONFLICT (alerta_id, paso) DO UPDATE SET quien = excluded.quien, hecho = excluded.hecho, actualizado = excluded.actualizado`,
  )
    .bind(id, marca.paso, quien, marca.hecho ? 1 : 0, Date.now(), id)
    .run();
  if (!r.meta.changes) return json({ ok: false, detalle: 'la alerta cambió; recarga la página' }, 409);
  return json({ ok: true, paso: marca.paso, hecho: marca.hecho, quien });
}

interface FilaReporte {
  id: string;
  tipo: string;
  lat: number;
  lon: number;
  nota: string | null;
  origen: string;
  creado: number;
  videos: number;
  audios: number;
  /** La evidencia más nueva del reporte que ya tiene miniatura (si hay). */
  con_miniatura: string | null;
}

/** "Cerca de ti": lo reportado en los últimos 30 días dentro de la caja, lo más nuevo primero. Sin `dispositivo`. */
async function buscarReportes(env: Env, params: URLSearchParams, origen: string): Promise<Response> {
  const b = validarBusqueda(params);
  const caja = cajaDe(b);
  const ahora = Date.now();
  const { results } = await env.DB.prepare(
    `SELECT r.id, r.tipo, r.lat, r.lon, r.nota, r.origen, r.creado,
       (SELECT COUNT(*) FROM evidencias e WHERE e.reporte_id = r.id AND e.tipo = 'video') AS videos,
       (SELECT COUNT(*) FROM evidencias e WHERE e.reporte_id = r.id AND e.tipo = 'audio') AS audios,
       (SELECT e.id FROM evidencias e WHERE e.reporte_id = r.id AND e.miniatura = 1 ORDER BY e.creado DESC LIMIT 1) AS con_miniatura
     FROM reportes r
     WHERE r.lat BETWEEN ? AND ? AND r.lon BETWEEN ? AND ? AND r.creado > ?
     ORDER BY r.creado DESC LIMIT 100`,
  )
    .bind(caja.latMin, caja.latMax, caja.lonMin, caja.lonMax, ahora - VENTANA_REPORTES_MS)
    .all<FilaReporte>();
  const reportes = results.map(({ con_miniatura, ...r }) => ({
    ...r,
    miniatura: con_miniatura ? `${origen}/api/evidencias/${con_miniatura}/miniatura` : null,
  }));
  return json({ ok: true, radioKm: b.radioKm, reportes, ahora });
}

async function crearReporte(env: Env, peticion: Request): Promise<Response> {
  if (Number(peticion.headers.get('Content-Length') ?? 0) > 4096) return json({ ok: false, detalle: 'mensaje demasiado grande' }, 413);
  const texto = await peticion.text();
  if (texto.length > 4096) return json({ ok: false, detalle: 'mensaje demasiado grande' }, 413);
  let cuerpo: unknown;
  try {
    cuerpo = JSON.parse(texto);
  } catch {
    return json({ ok: false, detalle: 'JSON inválido' }, 400);
  }
  const r = validarReporte(cuerpo);
  const ahora = Date.now();
  const recientes = await env.DB.prepare(`SELECT COUNT(*) AS n FROM reportes WHERE dispositivo = ? AND origen = 'comunidad' AND creado > ?`)
    .bind(r.dispositivo, ahora - 3600_000)
    .first<{ n: number }>();
  if ((recientes?.n ?? 0) >= MAX_REPORTES_POR_HORA) return json({ ok: false, detalle: `máximo ${MAX_REPORTES_POR_HORA} reportes por hora` }, 429);
  const id = nuevoId();
  await env.DB.prepare(`INSERT INTO reportes (id, tipo, lat, lon, nota, dispositivo, origen, creado) VALUES (?, ?, ?, ?, ?, ?, 'comunidad', ?)`)
    .bind(id, r.tipo, r.lat, r.lon, r.nota, r.dispositivo, ahora)
    .run();
  return json({ ok: true, reporte: { id, tipo: r.tipo, lat: r.lat, lon: r.lon, nota: r.nota, origen: 'comunidad', creado: ahora } }, 201);
}

/** Sube un video o audio a R2. El cuerpo es el archivo tal cual (sin multipart). */
async function subirEvidencia(env: Env, peticion: Request, origen: string): Promise<Response> {
  if (Number(peticion.headers.get('Content-Length') ?? 0) > MAX_EVIDENCIA_BYTES) return json({ ok: false, detalle: 'el archivo pasa de 50 MB' }, 413);
  const e = validarEvidencia(peticion.headers);
  if (!peticion.body) return json({ ok: false, detalle: 'el archivo llegó vacío' }, 400);
  const ahora = Date.now();
  const recientes = await env.DB.prepare('SELECT COUNT(*) AS n FROM evidencias WHERE dispositivo = ? AND creado > ?')
    .bind(e.dispositivo, ahora - 3600_000)
    .first<{ n: number }>();
  if ((recientes?.n ?? 0) >= MAX_EVIDENCIAS_POR_HORA) return json({ ok: false, detalle: `máximo ${MAX_EVIDENCIAS_POR_HORA} archivos por hora` }, 429);
  const id = nuevoId();
  // R2 necesita saber el largo de antemano: FixedLengthStream además corta si llega más (o menos) de lo anunciado.
  const largo = new FixedLengthStream(e.bytes);
  const copia = peticion.body.pipeTo(largo.writable);
  const [objeto] = await Promise.all([env.EVIDENCIAS.put(id, largo.readable, { httpMetadata: { contentType: e.mime } }), copia]);
  const abierta = await alertaAbierta(env, e.dispositivo, ahora);
  const reporteId = e.lat !== null && e.lon !== null ? await reporteParaGrabacion(env, e.dispositivo, e.lat, e.lon, abierta?.id ?? null, ahora) : null;
  await env.DB.prepare('INSERT INTO evidencias (id, dispositivo, alerta_id, tipo, mime, bytes, lat, lon, creado, reporte_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, e.dispositivo, abierta?.id ?? null, e.tipo, e.mime, objeto.size, e.lat, e.lon, ahora, reporteId)
    .run();
  return json(
    { ok: true, id, tipo: e.tipo, bytes: objeto.size, enlace: `${origen}/api/evidencias/${id}`, alerta: abierta?.id ?? null, reporte: reporteId },
    201,
  );
}

/**
 * El reporte de "Cerca de ti" del que cuelga una grabación: el de la alerta abierta de ese celular (si ya
 * está en el mapa); si no, el que ese celular hizo hace poco en el mismo lugar; si no, uno nuevo de tipo
 * 'grabacion'. La ubicación ya viene redondeada a ~100 m (validarEvidencia).
 */
async function reporteParaGrabacion(env: Env, dispositivo: string, lat: number, lon: number, alertaId: string | null, ahora: number): Promise<string> {
  if (alertaId) {
    const deAlerta = await env.DB.prepare(`SELECT id FROM reportes WHERE alerta_id = ? AND origen = 'alerta'`).bind(alertaId).first<{ id: string }>();
    if (deAlerta) return deAlerta.id;
  }
  const g = JUNTAR_GRABACIONES_GRADOS;
  const reciente = await env.DB.prepare(
    `SELECT id FROM reportes WHERE dispositivo = ? AND creado > ? AND lat BETWEEN ? AND ? AND lon BETWEEN ? AND ? ORDER BY creado DESC LIMIT 1`,
  )
    .bind(dispositivo, ahora - JUNTAR_GRABACIONES_MS, lat - g, lat + g, lon - g, lon + g)
    .first<{ id: string }>();
  if (reciente) return reciente.id;
  const id = nuevoId();
  await env.DB.prepare(`INSERT INTO reportes (id, tipo, lat, lon, nota, dispositivo, origen, creado) VALUES (?, 'grabacion', ?, ?, NULL, ?, 'comunidad', ?)`)
    .bind(id, lat, lon, dispositivo, ahora)
    .run();
  return id;
}

/** Guarda la miniatura (JPEG) de una evidencia. Solo la puede subir el mismo celular que subió la evidencia. */
async function subirMiniatura(env: Env, id: string, peticion: Request): Promise<Response> {
  const m = validarMiniatura(peticion.headers);
  if (!peticion.body) return json({ ok: false, detalle: 'la imagen llegó vacía' }, 400);
  const fila = await env.DB.prepare('SELECT dispositivo FROM evidencias WHERE id = ?').bind(id).first<{ dispositivo: string }>();
  // Mismo mensaje si no existe o si es de otro celular: no revelamos qué ids existen.
  if (!fila || fila.dispositivo !== m.dispositivo) return json({ ok: false, detalle: 'no existe esa evidencia' }, 404);
  const largo = new FixedLengthStream(m.bytes);
  const copia = peticion.body.pipeTo(largo.writable);
  await Promise.all([env.EVIDENCIAS.put(`${id}.jpg`, largo.readable, { httpMetadata: { contentType: 'image/jpeg' } }), copia]);
  await env.DB.prepare('UPDATE evidencias SET miniatura = 1 WHERE id = ?').bind(id).run();
  return json({ ok: true }, 201);
}

async function verMiniatura(env: Env, id: string, peticion: Request): Promise<Response> {
  const objeto = await env.EVIDENCIAS.get(`${id}.jpg`);
  if (!objeto) return json({ ok: false, detalle: 'esa evidencia no tiene miniatura' }, 404);
  const cabeceras = new Headers(CORS);
  cabeceras.set('Content-Type', 'image/jpeg');
  cabeceras.set('Content-Length', String(objeto.size));
  cabeceras.set('ETag', objeto.httpEtag);
  cabeceras.set('Cache-Control', 'public, max-age=86400');
  cabeceras.set('X-Content-Type-Options', 'nosniff');
  return new Response(peticion.method === 'HEAD' ? null : objeto.body, { headers: cabeceras });
}

/** Devuelve el archivo. Acepta `Range` (los navegadores lo piden para adelantar un video). */
async function verEvidencia(env: Env, id: string, peticion: Request): Promise<Response> {
  const pideRango = peticion.headers.has('Range');
  const objeto = await env.EVIDENCIAS.get(id, pideRango ? { range: peticion.headers } : undefined);
  if (!objeto) return json({ ok: false, detalle: 'no existe esa evidencia' }, 404);
  const cabeceras = new Headers(CORS);
  objeto.writeHttpMetadata(cabeceras);
  cabeceras.set('ETag', objeto.httpEtag);
  cabeceras.set('Accept-Ranges', 'bytes');
  cabeceras.set('Cache-Control', 'private, max-age=3600');
  // Que el navegador no "adivine" otro tipo: solo se sirve como video o audio.
  cabeceras.set('X-Content-Type-Options', 'nosniff');
  const rango = objeto.range as { offset?: number; length?: number } | undefined;
  const cuerpo = peticion.method === 'HEAD' ? null : objeto.body;
  if (pideRango && rango?.offset !== undefined && rango.length !== undefined) {
    cabeceras.set('Content-Range', `bytes ${rango.offset}-${rango.offset + rango.length - 1}/${objeto.size}`);
    cabeceras.set('Content-Length', String(rango.length));
    return new Response(cuerpo, { status: 206, headers: cabeceras });
  }
  cabeceras.set('Content-Length', String(objeto.size));
  return new Response(cuerpo, { headers: cabeceras });
}

async function salud(env: Env): Promise<Response> {
  const base = await env.DB.prepare('SELECT COUNT(*) AS n FROM alertas')
    .first<{ n: number }>()
    .then(() => true)
    .catch(() => false);
  return json({ ok: base, base, mensajes: proveedores(env) ?? 'sin proveedor' }, base ? 200 : 503);
}

export default {
  async fetch(peticion: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(peticion.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(peticion);
    if (peticion.method === 'OPTIONS') return new Response(null, { headers: CORS });
    try {
      if (url.pathname === '/api/salud') return await salud(env);
      // La app de Android para el equipo (el APK pesa ~100 MB: no entra en los archivos estáticos, va en R2).
      // También HEAD: lo usan los verificadores de enlaces y las vistas previas de WhatsApp.
      if (url.pathname === '/api/descargar/android' && (peticion.method === 'GET' || peticion.method === 'HEAD')) {
        const clave = 'app/AlertaArrebato.apk';
        const apk = peticion.method === 'HEAD' ? await env.EVIDENCIAS.head(clave) : await env.EVIDENCIAS.get(clave);
        if (!apk) return json({ ok: false, detalle: 'todavía no subimos la app' }, 404);
        return new Response(peticion.method === 'HEAD' ? null : (apk as R2ObjectBody).body, {
          headers: {
            'Content-Type': 'application/vnd.android.package-archive',
            'Content-Disposition': 'attachment; filename="AlertaArrebato.apk"',
            'Content-Length': String(apk.size),
            'Cache-Control': 'no-store',
          },
        });
      }
      if (url.pathname === '/api/eventos' && peticion.method === 'POST') {
        const largo = Number(peticion.headers.get('Content-Length') ?? 0);
        if (largo > MAX_CUERPO) return json({ ok: false, detalle: 'mensaje demasiado grande' }, 413);
        const texto = await peticion.text();
        if (texto.length > MAX_CUERPO) return json({ ok: false, detalle: 'mensaje demasiado grande' }, 413);
        let cuerpo: unknown;
        try {
          cuerpo = JSON.parse(texto);
        } catch {
          return json({ ok: false, detalle: 'JSON inválido' }, 400);
        }
        return await procesar(env, ctx, validarMensaje(cuerpo), url.origin);
      }
      const ver = url.pathname.match(/^\/api\/alertas\/([a-z0-9]{16})(?:\/(encargado|robo|bloqueo))?$/);
      if (ver && !ver[2] && peticion.method === 'GET') return await verAlerta(env, ver[1], url.origin);
      if (ver && ver[2] === 'encargado' && peticion.method === 'POST') return await marcarEncargado(env, ver[1], peticion, url.origin);
      if (ver && ver[2] === 'robo' && peticion.method === 'POST') return await confirmarRobo(env, ver[1], peticion);
      if (ver && ver[2] === 'bloqueo' && peticion.method === 'POST') return await marcarPasoBloqueo(env, ver[1], peticion);
      if (url.pathname === '/api/reportes' && peticion.method === 'GET') return await buscarReportes(env, url.searchParams, url.origin);
      if (url.pathname === '/api/reportes' && peticion.method === 'POST') return await crearReporte(env, peticion);
      if (url.pathname === '/api/evidencias' && peticion.method === 'POST') return await subirEvidencia(env, peticion, url.origin);
      const evidencia = url.pathname.match(/^\/api\/evidencias\/([a-z0-9]{16})$/);
      if (evidencia && (peticion.method === 'GET' || peticion.method === 'HEAD')) return await verEvidencia(env, evidencia[1], peticion);
      const miniatura = url.pathname.match(/^\/api\/evidencias\/([a-z0-9]{16})\/miniatura$/);
      if (miniatura && peticion.method === 'POST') return await subirMiniatura(env, miniatura[1], peticion);
      if (miniatura && (peticion.method === 'GET' || peticion.method === 'HEAD')) return await verMiniatura(env, miniatura[1], peticion);
      return json({ ok: false, detalle: 'no encontrado' }, 404);
    } catch (e) {
      if (e instanceof ErrorDeDatos) return json({ ok: false, detalle: e.message }, 400);
      console.error('Error del backend', e);
      return json({ ok: false, detalle: 'error interno' }, 500);
    }
  },

  /** Cada minuto: respaldo de la cuenta del servidor, y borra los teléfonos y el perfil de bloqueo de las alertas con más de 24 h. */
  async scheduled(_evento: ScheduledController, env: Env): Promise<void> {
    await avisarVencidas(env);
    const limite = Date.now() - RETENCION_CONTACTOS_MS;
    await env.DB.batch([
      env.DB.prepare('UPDATE alertas SET contactos_json = NULL, bloqueo_json = NULL WHERE (contactos_json IS NOT NULL OR bloqueo_json IS NOT NULL) AND creada < ?').bind(limite),
      // El avance del kit lleva nombres de la red: se va con los teléfonos.
      env.DB.prepare('DELETE FROM bloqueos WHERE alerta_id IN (SELECT id FROM alertas WHERE creada < ?)').bind(limite),
    ]);
  },
} satisfies ExportedHandler<Env>;
