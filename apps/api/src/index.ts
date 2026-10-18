import { MENSAJES, mandarMensaje, proveedores, type EnvMensajes, type Mensaje as MensajeWhatsApp } from './mensajes';
import {
  MAX_EVIDENCIA_BYTES,
  MAX_EVIDENCIAS_POR_HORA,
  MAX_REPORTES_POR_HORA,
  VENTANA_REPORTES_MS,
  cajaDe,
  redondear,
  validarBusqueda,
  validarEvidencia,
  validarReporte,
} from './comunidad';
import { ErrorDeDatos, enmascarar, validarMensaje, type Contacto, type Mensaje, type Punto } from './validar';

/**
 * Backend de Alerta Arrebato en Cloudflare Workers + D1. Una sola URL pública con HTTPS:
 * - `POST /api/eventos`: lo que manda la app (contrato en docs/PLAN.md §6.1).
 * - `GET  /api/alertas/:id`: lo que ve el contacto en `/a/:id` (sin teléfonos).
 * - `POST /api/alertas/:id/encargado`: "Yo me encargo" (avisa al resto de la red).
 * - `GET  /api/reportes?lat=&lon=&radioKm=` y `POST /api/reportes`: "Cerca de ti" (reportes de la comunidad).
 * - `POST /api/evidencias` y `GET /api/evidencias/:id`: video o audio guardado en R2.
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
          ? await avisar(env, fila.id, 'esta_bien', contactosDe(fila).map((c) => ({ contacto: c, mensaje: MENSAJES.estaBien(fila.nombre) })))
          : { avisados: 0, detalle: 'la red no había sido avisada' };
      await env.DB.batch([
        env.DB.prepare(`UPDATE alertas SET estado = 'cancelada', cancelada = ?, contactos_json = NULL, actualizada = ? WHERE id = ?`).bind(ahora, ahora, fila.id),
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
    case 'motivo_falsa_alarma':
      await env.DB.prepare('INSERT INTO motivos (dispositivo, motivo, creado) VALUES (?, ?, ?)').bind(m.dispositivo, m.motivo, ahora).run();
      return json({ ok: true });
  }
}

/** Lo que ve el contacto. Nunca devuelve teléfonos. */
async function verAlerta(env: Env, id: string, origen: string): Promise<Response> {
  const fila = await env.DB.prepare('SELECT * FROM alertas WHERE id = ? AND prueba = 0').bind(id).first<FilaAlerta>();
  if (!fila) return json({ ok: false, detalle: 'no existe esa alerta' }, 404);
  const { results } = await env.DB.prepare('SELECT t, lat, lon, velocidad, precision FROM ubicaciones WHERE alerta_id = ? ORDER BY t DESC LIMIT 600')
    .bind(id)
    .all<Punto>();
  const evidencias = await env.DB.prepare('SELECT id, tipo FROM evidencias WHERE alerta_id = ? ORDER BY creado ASC LIMIT 20')
    .bind(id)
    .all<{ id: string; tipo: string }>();
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
    evidencias: evidencias.results.map((e) => ({ id: e.id, tipo: e.tipo, enlace: `${origen}/api/evidencias/${e.id}` })),
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
  const r = await avisar(env, id, 'encargado', resto.map((x) => ({ contacto: x.c, mensaje: MENSAJES.encargado(quien, fila.nombre, enlace(origen, id, x.i)) })));
  return json({ ok: true, encargado: quien, avisados: r.avisados, detalle: r.detalle });
}

interface FilaReporte {
  id: string;
  tipo: string;
  lat: number;
  lon: number;
  nota: string | null;
  origen: string;
  creado: number;
}

/** "Cerca de ti": lo reportado en los últimos 30 días dentro de la caja, lo más nuevo primero. Sin `dispositivo`. */
async function buscarReportes(env: Env, params: URLSearchParams): Promise<Response> {
  const b = validarBusqueda(params);
  const caja = cajaDe(b);
  const ahora = Date.now();
  const { results } = await env.DB.prepare(
    `SELECT id, tipo, lat, lon, nota, origen, creado FROM reportes
     WHERE lat BETWEEN ? AND ? AND lon BETWEEN ? AND ? AND creado > ?
     ORDER BY creado DESC LIMIT 100`,
  )
    .bind(caja.latMin, caja.latMax, caja.lonMin, caja.lonMax, ahora - VENTANA_REPORTES_MS)
    .all<FilaReporte>();
  return json({ ok: true, radioKm: b.radioKm, reportes: results, ahora });
}

async function crearReporte(env: Env, peticion: Request): Promise<Response> {
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
  await env.DB.prepare('INSERT INTO evidencias (id, dispositivo, alerta_id, tipo, mime, bytes, lat, lon, creado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, e.dispositivo, abierta?.id ?? null, e.tipo, e.mime, objeto.size, e.lat, e.lon, ahora)
    .run();
  return json({ ok: true, id, tipo: e.tipo, bytes: objeto.size, enlace: `${origen}/api/evidencias/${id}`, alerta: abierta?.id ?? null }, 201);
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
      if (url.pathname === '/api/descargar/android' && peticion.method === 'GET') {
        const apk = await env.EVIDENCIAS.get('app/AlertaArrebato.apk');
        if (!apk) return json({ ok: false, detalle: 'todavía no subimos la app' }, 404);
        return new Response(apk.body, {
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
      const ver = url.pathname.match(/^\/api\/alertas\/([a-z0-9]{16})(\/encargado)?$/);
      if (ver && !ver[2] && peticion.method === 'GET') return await verAlerta(env, ver[1], url.origin);
      if (ver && ver[2] && peticion.method === 'POST') return await marcarEncargado(env, ver[1], peticion, url.origin);
      if (url.pathname === '/api/reportes' && peticion.method === 'GET') return await buscarReportes(env, url.searchParams);
      if (url.pathname === '/api/reportes' && peticion.method === 'POST') return await crearReporte(env, peticion);
      if (url.pathname === '/api/evidencias' && peticion.method === 'POST') return await subirEvidencia(env, peticion, url.origin);
      const evidencia = url.pathname.match(/^\/api\/evidencias\/([a-z0-9]{16})$/);
      if (evidencia && (peticion.method === 'GET' || peticion.method === 'HEAD')) return await verEvidencia(env, evidencia[1], peticion);
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
