import { TEXTOS, hayProveedor, horaLima, mandarMensaje, type EnvMensajes } from './mensajes';
import { ErrorDeDatos, enmascarar, validarMensaje, type Contacto, type Mensaje, type Punto } from './validar';

/**
 * Backend de Alerta Arrebato en Cloudflare Workers + D1. Una sola URL pública con HTTPS:
 * - `POST /api/eventos`: lo que manda la app (contrato en docs/PLAN.md §6.1).
 * - `GET  /api/alertas/:id`: lo que ve el contacto en `/a/:id` (sin teléfonos).
 * - `POST /api/alertas/:id/encargado`: "Yo me encargo" (avisa al resto de la red).
 * - `GET  /api/salud`: si la base y Zavu están listos.
 * - Todo lo demás: la web de la app (export de Expo en apps/movil/dist).
 */

export interface Env extends EnvMensajes {
  DB: D1Database;
  ASSETS: Fetcher;
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
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(datos: unknown, estado = 200): Response {
  return new Response(JSON.stringify(datos), { status: estado, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...CORS } });
}

/** Token del enlace público: 16 caracteres aleatorios (≈ 95 bits), imposible de adivinar. */
function nuevoId(): string {
  const letras = 'abcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => letras[b % letras.length]).join('');
}

interface FilaAlerta {
  id: string;
  dispositivo: string;
  nombre: string;
  estado: 'en_espera' | 'avisada' | 'cancelada';
  prueba: number;
  via: string | null;
  confianza: string | null;
  velocidad_ms: number | null;
  t_jalon: number | null;
  lat_jalon: number | null;
  lon_jalon: number | null;
  contactos_json: string | null;
  encargado: string | null;
  espera_s: number | null;
  origen: string | null;
  creada: number;
  avisada: number | null;
  cancelada: number | null;
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
  destinos: Array<{ contacto: Contacto; texto: string; plantilla?: Record<string, string> }>,
): Promise<{ avisados: number; detalle: string }> {
  const resultados = await Promise.all(
    destinos.map((d, i) => mandarMensaje(env, { telefono: d.contacto.telefono, texto: d.texto, plantilla: d.plantilla, idempotencia: `${alertaId}-${tipo}-${i}` })),
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
  const tJalon = fila.t_jalon ?? fila.creada;
  const r = await avisar(
    env,
    fila.id,
    'alerta',
    contactos.map((c, i) => ({
      contacto: c,
      texto: TEXTOS.alerta(fila.nombre, tJalon, enlace(origen, fila.id, i)),
      plantilla: { '1': fila.nombre, '2': horaLima(tJalon), '3': enlace(origen, fila.id, i) },
    })),
  );
  return { avisados: r.avisados, total: contactos.length, detalle: r.detalle };
}

/** Alertas cuya espera venció sin que el celular avisara ni cancelara: avisa el servidor. */
async function avisarVencidas(env: Env): Promise<void> {
  const ahora = Date.now();
  const { results } = await env.DB.prepare(
    `SELECT * FROM alertas WHERE estado = 'en_espera' AND prueba = 0 AND espera_s IS NOT NULL AND creada + espera_s * 1000 + ? <= ? AND creada > ?`,
  )
    .bind(MARGEN_SERVIDOR_MS, ahora, ahora - ALERTA_ABIERTA_MS)
    .all<FilaAlerta>();
  for (const fila of results) await avisarFamilia(env, fila, fila.origen ?? '');
}

/** El enlace que recibe cada contacto: `?c=<n>` dice quién es, para "Yo me encargo". */
function enlace(origen: string, id: string, indice?: number): string {
  return `${origen}/a/${id}${indice === undefined ? '' : `?c=${indice}`}`;
}

async function procesar(env: Env, ctx: ExecutionContext, m: Mensaje, origen: string): Promise<Response> {
  const ahora = Date.now();
  switch (m.tipo) {
    case 'alerta': {
      // Al panel, en silencio: la red todavía NO se avisa (el dueño tiene unos segundos para cancelar).
      const id = nuevoId();
      const p = m.evento.posicionJalon ?? m.ruta[m.ruta.length - 1] ?? null;
      await env.DB.batch([
        env.DB.prepare(
          `INSERT INTO alertas (id, dispositivo, nombre, estado, via, confianza, velocidad_ms, t_jalon, lat_jalon, lon_jalon, contactos_json, espera_s, origen, creada, actualizada)
           VALUES (?, ?, ?, 'en_espera', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).bind(id, m.dispositivo, m.nombre, m.evento.via, m.evento.confianza, m.evento.velocidadMs, m.evento.tJalon, p?.lat ?? null, p?.lon ?? null, JSON.stringify(m.contactos), m.esperaS, origen, ahora, ahora),
        ...guardarPuntos(env, id, m.ruta),
      ]);
      // La cuenta del servidor: si el celular se apaga o se queda sin señal, igual se avisa a la red.
      ctx.waitUntil(
        new Promise((listo) => setTimeout(listo, m.esperaS * 1000 + MARGEN_SERVIDOR_MS)).then(() => avisarVencidas(env)),
      );
      return json({ ok: true, id, enlace: enlace(origen, id), detalle: 'en el panel' });
    }
    case 'notificar_familia': {
      let fila = await alertaAbierta(env, m.dispositivo, ahora);
      if (!fila) {
        // La `alerta` no llegó (sin señal en ese momento): la creamos ahora para no perder el aviso.
        const id = nuevoId();
        const p = m.evento.posicionJalon;
        await env.DB.prepare(
          `INSERT INTO alertas (id, dispositivo, nombre, estado, via, confianza, velocidad_ms, t_jalon, lat_jalon, lon_jalon, contactos_json, creada, actualizada)
           VALUES (?, ?, ?, 'en_espera', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
          .bind(id, m.dispositivo, m.nombre, m.evento.via, m.evento.confianza, m.evento.velocidadMs, m.evento.tJalon, p?.lat ?? null, p?.lon ?? null, JSON.stringify(m.contactos), ahora, ahora)
          .run();
        fila = await env.DB.prepare('SELECT * FROM alertas WHERE id = ?').bind(id).first<FilaAlerta>();
        if (!fila) return json({ ok: false, detalle: 'no se pudo guardar la alerta' }, 500);
      }
      if (m.contactos.length) fila.contactos_json = JSON.stringify(m.contactos);
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
      const fila = await alertaAbierta(env, m.dispositivo, ahora);
      if (!fila) return json({ ok: true, detalle: 'no había una alerta abierta' });
      // Si la red ya había sido avisada, le decimos que está bien. Después borramos sus teléfonos.
      const r =
        fila.estado === 'avisada'
          ? await avisar(env, fila.id, 'esta_bien', contactosDe(fila).map((c) => ({ contacto: c, texto: TEXTOS.estaBien(fila.nombre) })))
          : { avisados: 0, detalle: 'la red no había sido avisada' };
      await env.DB.prepare(`UPDATE alertas SET estado = 'cancelada', cancelada = ?, contactos_json = NULL, actualizada = ? WHERE id = ?`).bind(ahora, ahora, fila.id).run();
      return json({ ok: true, id: fila.id, avisados: r.avisados, detalle: r.detalle });
    }
    case 'prueba': {
      // La prueba guiada: un mensaje marcado como PRUEBA con un enlace a la vista de ejemplo.
      const id = nuevoId();
      await env.DB.prepare(`INSERT INTO alertas (id, dispositivo, nombre, estado, prueba, creada, actualizada) VALUES (?, ?, ?, 'cancelada', 1, ?, ?)`)
        .bind(id, m.dispositivo, m.nombre, ahora, ahora)
        .run();
      const r = await avisar(env, id, 'prueba', m.contactos.map((c) => ({ contacto: c, texto: TEXTOS.prueba(m.nombre, `${origen}/a/ejemplo`) })));
      return json({ ok: r.avisados > 0 || m.contactos.length === 0, avisados: r.avisados, total: m.contactos.length, detalle: r.detalle });
    }
    case 'motivo_falsa_alarma':
      await env.DB.prepare('INSERT INTO motivos (dispositivo, motivo, creado) VALUES (?, ?, ?)').bind(m.dispositivo, m.motivo, ahora).run();
      return json({ ok: true });
  }
}

/** Lo que ve el contacto. Nunca devuelve teléfonos. */
async function verAlerta(env: Env, id: string): Promise<Response> {
  const fila = await env.DB.prepare('SELECT * FROM alertas WHERE id = ? AND prueba = 0').bind(id).first<FilaAlerta>();
  if (!fila) return json({ ok: false, detalle: 'no existe esa alerta' }, 404);
  const { results } = await env.DB.prepare('SELECT t, lat, lon, velocidad, precision FROM ubicaciones WHERE alerta_id = ? ORDER BY t DESC LIMIT 600')
    .bind(id)
    .all<Punto>();
  return json({
    ok: true,
    id: fila.id,
    nombre: fila.nombre,
    estado: fila.estado,
    via: fila.via,
    velocidadMs: fila.velocidad_ms,
    tJalon: fila.t_jalon,
    jalon: fila.lat_jalon !== null && fila.lon_jalon !== null ? { lat: fila.lat_jalon, lon: fila.lon_jalon } : null,
    ruta: results.reverse(),
    encargado: fila.encargado,
    avisada: fila.avisada,
    cancelada: fila.cancelada,
    ahora: Date.now(),
  });
}

async function marcarEncargado(env: Env, id: string, peticion: Request, origen: string): Promise<Response> {
  const fila = await env.DB.prepare('SELECT * FROM alertas WHERE id = ? AND prueba = 0').bind(id).first<FilaAlerta>();
  if (!fila) return json({ ok: false, detalle: 'no existe esa alerta' }, 404);
  if (fila.encargado) return json({ ok: true, encargado: fila.encargado, detalle: 'ya había alguien a cargo' });
  const cuerpo = (await peticion.json().catch(() => ({}))) as { contacto?: unknown };
  const contactos = contactosDe(fila);
  const indice = typeof cuerpo.contacto === 'number' && Number.isInteger(cuerpo.contacto) ? cuerpo.contacto : -1;
  const quien = contactos[indice]?.nombre ?? 'Alguien de tu red';
  await env.DB.prepare('UPDATE alertas SET encargado = ?, actualizada = ? WHERE id = ?').bind(quien, Date.now(), id).run();
  const resto = contactos.map((c, i) => ({ c, i })).filter((x) => x.i !== indice);
  const r = await avisar(env, id, 'encargado', resto.map((x) => ({ contacto: x.c, texto: TEXTOS.encargado(quien, fila.nombre, enlace(origen, id, x.i)) })));
  return json({ ok: true, encargado: quien, avisados: r.avisados, detalle: r.detalle });
}

async function salud(env: Env): Promise<Response> {
  const base = await env.DB.prepare('SELECT COUNT(*) AS n FROM alertas')
    .first<{ n: number }>()
    .then(() => true)
    .catch(() => false);
  return json({ ok: base, base, mensajes: hayProveedor(env) ? 'zavu' : 'sin proveedor (falta ZAVU_API_KEY)' }, base ? 200 : 503);
}

export default {
  async fetch(peticion: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(peticion.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(peticion);
    if (peticion.method === 'OPTIONS') return new Response(null, { headers: CORS });
    try {
      if (url.pathname === '/api/salud') return await salud(env);
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
      const ver = url.pathname.match(/^\/api\/alertas\/([a-z0-9]{16})(\/encargado)?$/);
      if (ver && !ver[2] && peticion.method === 'GET') return await verAlerta(env, ver[1]);
      if (ver && ver[2] && peticion.method === 'POST') return await marcarEncargado(env, ver[1], peticion, url.origin);
      return json({ ok: false, detalle: 'no encontrado' }, 404);
    } catch (e) {
      if (e instanceof ErrorDeDatos) return json({ ok: false, detalle: e.message }, 400);
      console.error('Error del backend', e);
      return json({ ok: false, detalle: 'error interno' }, 500);
    }
  },

  /** Cada minuto: respaldo de la cuenta del servidor, y borra los teléfonos de las alertas con más de 24 h. */
  async scheduled(_evento: ScheduledController, env: Env): Promise<void> {
    await avisarVencidas(env);
    await env.DB.prepare('UPDATE alertas SET contactos_json = NULL WHERE contactos_json IS NOT NULL AND creada < ?')
      .bind(Date.now() - RETENCION_CONTACTOS_MS)
      .run();
  },
} satisfies ExportedHandler<Env>;
