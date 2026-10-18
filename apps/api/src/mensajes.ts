/**
 * Mensajes a la red de confianza por WhatsApp. Dos caminos:
 *
 * 1. **Meta directo (WhatsApp Cloud API)**, si hay `META_WA_TOKEN` y `META_WA_NUMERO_ID`: llega a CUALQUIER
 *    número, sin que la persona nos haya escrito antes, porque usa plantillas aprobadas por Meta
 *    (`PLANTILLAS`). Es el camino principal de la demo.
 *    Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-message-templates
 * 2. **Zavu** (sponsor), si hay `ZAVU_API_KEY`:
 *    - clave "live" (con número propio en Zavu): además del WhatsApp, manda el mismo aviso por **SMS**;
 *    - clave de prueba (`zv_test_…`, el sandbox): solo respaldo por WhatsApp, y solo llega a teléfonos del
 *      equipo que antes le escribieron al número de Zavu.
 *    Docs: https://docs.zavu.dev/api-reference/send-a-message.md
 *
 * Sin ninguno de los dos no se manda nada y lo decimos tal cual (la app muestra "no se pudo avisar").
 * Los textos van sin tildes ni emojis: en SMS, una tilde baja el límite de 160 a 70 caracteres.
 */

export interface EnvMensajes {
  META_WA_TOKEN?: string;
  META_WA_NUMERO_ID?: string;
  ZAVU_API_KEY?: string;
  /** "si" para que, además del SMS, Zavu LLAME a cada contacto (necesita un agente con voz en el sender). */
  ZAVU_LLAMADAS?: string;
}

export interface ResultadoMensaje {
  ok: boolean;
  canal: string | null;
  detalle: string;
}

export function hayMeta(env: EnvMensajes): boolean {
  return Boolean(env.META_WA_TOKEN && env.META_WA_NUMERO_ID);
}

/** Con qué se mandan los mensajes ('meta', 'zavu', 'meta+zavu') o `null` si con nada. */
export function proveedores(env: EnvMensajes): string | null {
  const lista = [hayMeta(env) ? 'meta' : '', env.ZAVU_API_KEY ? 'zavu' : ''].filter(Boolean);
  return lista.length ? lista.join('+') : null;
}

/** Hora de Lima (HH:MM), que es la que entiende la familia. */
export function horaLima(t: number): string {
  return new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Lima' }).format(t);
}

/**
 * Cada mensaje en dos formas: el texto libre (Zavu) y la plantilla de Meta con sus variables en orden.
 * Las plantillas se crean en el Administrador de WhatsApp con estos nombres, idioma "es" y categoría
 * "Utilidad"; el cuerpo de cada una está en apps/api/README.md.
 */
export interface Mensaje {
  texto: string;
  /**
   * Texto para SMS. Sin enlace: Zavu rechaza nuestros enlaces (revisión automática "AI"/"Security"), así que el
   * SMS lleva un CÓDIGO que el contacto escribe en la app ("Recibí un aviso") o en la web (/aviso). Sin "robo".
   */
  sms: string;
  plantilla: { nombre: string; variables: string[] };
}

/** El código de la vista de ejemplo (la prueba guiada). */
export const CODIGO_EJEMPLO = 'EJEMPLO';

/**
 * El código que recibe cada contacto: las 6 primeras letras del id de la alerta (en mayúsculas) y el número del
 * contacto (1 a 5). Ej.: alerta `28kaakxh…`, contacto 0 → `28KAAK1`. Con eso la app abre `/a/<id>?c=<n>`.
 */
export function codigoContacto(alertaId: string, indice: number): string {
  return `${alertaId.slice(0, 6).toUpperCase()}${indice + 1}`;
}

/** `28kaak 1`, `28-KAAK-1` → `{ prefijo: '28kaak', indice: 0 }`; `EJEMPLO` → ejemplo; si no tiene la forma, `null`. */
export function leerCodigo(texto: string): { prefijo: string; indice: number } | 'ejemplo' | null {
  const limpio = texto.replace(/[\s-]/g, '').toUpperCase();
  if (limpio === CODIGO_EJEMPLO) return 'ejemplo';
  const m = limpio.match(/^([A-Z2-9]{6})([1-5])$/);
  return m ? { prefijo: m[1].toLowerCase(), indice: Number(m[2]) - 1 } : null;
}

export const MENSAJES = {
  alerta: (nombre: string, t: number, enlace: string, codigo: string): Mensaje => ({
    texto: `ALERTA: posible robo del celular de ${nombre} a las ${horaLima(t)}. Probablemente ${nombre} esta bien. Ruta en vivo: ${enlace}`,
    sms: `Alerta Arrebato: ${nombre} te tiene como contacto de emergencia y su app envio un aviso a las ${horaLima(t)}. Abre la app Alerta Arrebato, toca "Recibi un aviso" y escribe el codigo ${codigo}`,
    plantilla: { nombre: 'alerta_arrebato', variables: [nombre, horaLima(t), enlace] },
  }),
  estaBien: (nombre: string): Mensaje => ({
    texto: `${nombre} confirmo con su PIN que esta bien: fue falsa alarma. Gracias por estar atento.`,
    sms: `Alerta Arrebato: ${nombre} confirmo que esta bien, fue una falsa alarma. No tienes que hacer nada.`,
    plantilla: { nombre: 'alerta_arrebato_bien', variables: [nombre] },
  }),
  encargado: (quien: string, nombre: string, enlace: string, codigo: string): Mensaje => ({
    texto: `${quien} dijo que se encarga del robo del celular de ${nombre}. Ruta: ${enlace}`,
    sms: `Alerta Arrebato: ${quien} se esta encargando de lo que le paso a ${nombre}. Sigue viendo su ubicacion en la app con tu codigo ${codigo}`,
    plantilla: { nombre: 'alerta_arrebato_encargado', variables: [quien, nombre, enlace] },
  }),
  prueba: (nombre: string, enlace: string): Mensaje => ({
    texto: `PRUEBA de Alerta Arrebato: ${nombre} te eligio como contacto de confianza. Si le arranchan el celular te llegara un mensaje asi, con su ruta: ${enlace}`,
    sms: `Alerta Arrebato: ${nombre} te agrego como contacto de confianza. Si algun dia te avisa, abre la app Alerta Arrebato, toca "Recibi un aviso" y escribe el codigo que te llegue. Para ver como se ve, usa el codigo ${CODIGO_EJEMPLO}`,
    plantilla: { nombre: 'alerta_arrebato_prueba', variables: [nombre, enlace] },
  }),
};

/**
 * iPhone no deja que una app lo bloquee, pero Atajos sí: la dueña crea una automatización "Al recibir un mensaje
 * que contenga PALABRA_BLOQUEO → Bloquear pantalla". Al confirmar un arrebato le mandamos este SMS a SU número.
 * Sin enlace y sin "robo" (el filtro de Zavu). Si cambias la palabra, cambia también la guía de la app.
 */
export const PALABRA_BLOQUEO = 'AA-BLOQUEO';
export const SMS_BLOQUEO = `Alerta Arrebato ${PALABRA_BLOQUEO}. Si no fuiste tu, ignora este mensaje.`;

/**
 * El SMS que bloquea el iPhone de la dueña. Solo SMS: un WhatsApp no dispara la automatización de Mensajes.
 * Necesita la clave "live" de Zavu (la de prueba no manda SMS).
 */
export async function mandarSmsBloqueo(env: EnvMensajes, telefono: string, idempotencia: string): Promise<ResultadoMensaje> {
  if (!env.ZAVU_API_KEY || env.ZAVU_API_KEY.trim().startsWith('zv_test_')) {
    return { ok: false, canal: null, detalle: 'falta la clave live de Zavu para mandar SMS' };
  }
  return porZavu(env, telefono, SMS_BLOQUEO, idempotencia, 'sms');
}

async function llamarMeta(env: EnvMensajes, cuerpo: Record<string, unknown>): Promise<ResultadoMensaje> {
  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/${env.META_WA_NUMERO_ID}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${(env.META_WA_TOKEN ?? '').trim()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', ...cuerpo }),
      signal: AbortSignal.timeout(8000),
    });
    const datos = (await r.json().catch(() => ({}))) as { error?: { code?: number; message?: string } };
    if (r.ok) return { ok: true, canal: 'whatsapp (meta)', detalle: 'enviado' };
    return { ok: false, canal: null, detalle: `Meta ${r.status} ${datos.error?.code ?? ''} ${datos.error?.message?.slice(0, 120) ?? ''}`.trim() };
  } catch (e) {
    return { ok: false, canal: null, detalle: e instanceof Error ? `Meta: ${e.message}` : 'Meta: error de red' };
  }
}

/**
 * Primero la plantilla aprobada (llega a cualquiera). Si falla (por ejemplo, todavía en revisión), texto libre:
 * Meta lo acepta si esa persona le escribió al número en las últimas 24 h (así probamos con el equipo).
 */
async function porMeta(env: EnvMensajes, telefono: string, m: Mensaje): Promise<ResultadoMensaje> {
  const to = telefono.replace(/^\+/, '');
  const conPlantilla = await llamarMeta(env, {
    to,
    type: 'template',
    template: {
      name: m.plantilla.nombre,
      language: { code: 'es' },
      components: [{ type: 'body', parameters: m.plantilla.variables.map((text) => ({ type: 'text', text })) }],
    },
  });
  if (conPlantilla.ok) return conPlantilla;
  const conTexto = await llamarMeta(env, { to, type: 'text', text: { body: m.texto, preview_url: true } });
  return conTexto.ok ? { ...conTexto, detalle: `enviado como texto (plantilla: ${conPlantilla.detalle})` } : { ...conTexto, detalle: `${conPlantilla.detalle}; texto: ${conTexto.detalle}` };
}

export async function mandarMensaje(
  env: EnvMensajes,
  a: { telefono: string; mensaje: Mensaje; idempotencia: string },
): Promise<ResultadoMensaje> {
  // WhatsApp por Meta y, si la clave de Zavu es "live" (tiene número propio), también SMS: si uno falla, el
  // otro igual llega. Con la clave de prueba de Zavu solo se usa como respaldo de WhatsApp.
  const zavuLive = Boolean(env.ZAVU_API_KEY) && !env.ZAVU_API_KEY!.trim().startsWith('zv_test_');
  const intentos: Array<Promise<ResultadoMensaje>> = [];
  if (hayMeta(env)) intentos.push(porMeta(env, a.telefono, a.mensaje));
  if (zavuLive) intentos.push(porZavu(env, a.telefono, a.mensaje.sms, `${a.idempotencia}-sms`, 'sms'));
  let resultados = await Promise.all(intentos);
  if (!resultados.some((r) => r.ok) && env.ZAVU_API_KEY && !zavuLive) {
    resultados = [...resultados, await porZavu(env, a.telefono, a.mensaje.texto, a.idempotencia, 'whatsapp')];
  }
  if (resultados.length === 0) return { ok: false, canal: null, detalle: 'falta configurar WhatsApp (Meta o Zavu)' };
  const buenos = resultados.filter((r) => r.ok);
  const fallidos = resultados.filter((r) => !r.ok).map((r) => r.detalle);
  // Si un camino falló y otro no, lo dejamos anotado (en el registro de envíos) para saber por qué.
  // También lo que salió "a medias" (por ejemplo, el SMS sin enlace porque Zavu rechazó el enlace).
  const notas = [...buenos.filter((r) => r.detalle !== 'enviado').map((r) => r.detalle), ...fallidos.map((r) => `falló: ${r}`)];
  if (buenos.length) return { ok: true, canal: buenos.map((r) => r.canal).join(' + '), detalle: notas.length ? `enviado (${notas.join('; ')})` : 'enviado' };
  return { ok: false, canal: null, detalle: resultados.map((r) => r.detalle).join('; ') };
}

/** Lo que dice la llamada al contestar. Sin "robo": la revisión de riesgo de Zavu lee cada llamada antes de marcar. */
export function saludoLlamada(nombre: string, codigo: string): string {
  // Letra por letra, con pausas: "2, 8, K, A, A, K, 1".
  const deletreado = codigo.split('').join(', ');
  return `Hola, te llama la aplicacion Alerta Arrebato. ${nombre} te tiene como contacto de emergencia y su celular envio un aviso hace un momento. Para ver su ubicacion en vivo, abre la aplicacion Alerta Arrebato, toca Recibi un aviso, y escribe este codigo: ${deletreado}. Repito: ${deletreado}. Tambien te lo mandamos por mensaje de texto. Si no tienes la aplicacion, entra a alerta punto gadidgc punto com, barra aviso. Y llama a ${nombre}.`;
}

/**
 * Hace sonar el celular del contacto: una llamada de Zavu que lee `saludoLlamada` (el SMS se puede pasar por alto;
 * una llamada, no). Solo si `ZAVU_LLAMADAS` = "si" y la clave es "live". Docs: https://docs.zavu.dev/api-reference/voice-agents/place-a-voice-call.md
 */
export async function llamar(env: EnvMensajes, telefono: string, nombre: string, alertaId: string, codigo: string): Promise<ResultadoMensaje> {
  const clave = env.ZAVU_API_KEY?.trim();
  if (env.ZAVU_LLAMADAS !== 'si' || !clave || clave.startsWith('zv_test_')) return { ok: false, canal: null, detalle: 'llamadas apagadas' };
  try {
    const r = await fetch('https://api.zavu.dev/v1/calls', {
      method: 'POST',
      headers: { Authorization: `Bearer ${clave}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: telefono, greeting: saludoLlamada(nombre, codigo), language: 'es', maxDurationMinutes: 2, metadata: { alerta: alertaId } }),
      signal: AbortSignal.timeout(8000),
    });
    const datos = (await r.json().catch(() => ({}))) as { error?: { code?: string; message?: string } };
    if (r.status === 202 || r.status === 200) return { ok: true, canal: 'llamada', detalle: 'llamando' };
    return { ok: false, canal: null, detalle: `Zavu llamada ${r.status} ${datos.error?.code ?? ''} ${datos.error?.message?.slice(0, 160) ?? ''}`.trim() };
  } catch (e) {
    return { ok: false, canal: null, detalle: e instanceof Error ? `Zavu llamada: ${e.message}` : 'Zavu llamada: error de red' };
  }
}

async function porZavu(env: EnvMensajes, telefono: string, texto: string, idempotencia: string, canal: 'sms' | 'whatsapp'): Promise<ResultadoMensaje> {
  if (!env.ZAVU_API_KEY) return { ok: false, canal: null, detalle: 'falta configurar Zavu' };
  // Al pegar la clave a veces se cuela un espacio o un salto de línea.
  const clave = env.ZAVU_API_KEY.trim();
  // Zavu exige verificar cada enlace antes de mandarlo por SMS (lo revisa con Google Web Risk al instante).
  // Si no, bloquea el mensaje con `sms_compliance_blocked`. Un fallo aquí no detiene el envío.
  if (canal === 'sms') {
    for (const url of texto.match(/https?:\/\/\S+/g) ?? []) {
      await fetch('https://api.zavu.dev/v1/urls', {
        method: 'POST',
        headers: { Authorization: `Bearer ${clave}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        signal: AbortSignal.timeout(5000),
      }).catch(() => undefined);
    }
  }
  const cuerpo = { to: telefono, channel: canal, text: texto };
  try {
    const r = await fetch('https://api.zavu.dev/v1/messages', {
      method: 'POST',
      headers: { Authorization: `Bearer ${clave}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...cuerpo, fallbackEnabled: false, idempotencyKey: idempotencia }),
      signal: AbortSignal.timeout(8000),
    });
    const crudo = await r.text().catch(() => '');
    let datos: { message?: { channel?: string }; error?: { code?: string; message?: string } } = {};
    try {
      datos = JSON.parse(crudo);
    } catch {
      // Respuesta sin JSON: abajo va el texto tal cual.
    }
    // 409 = ya se mandó con esta misma clave (un reintento de la app): cuenta como enviado.
    if (r.status === 202 || r.status === 200 || r.status === 409) return { ok: true, canal: datos.message?.channel ?? canal, detalle: 'enviado' };
    // Si Zavu no manda `error.code` (pasó con un 403), guardamos el cuerpo para saber por qué.
    const motivo = datos.error?.code ? `${datos.error.code} ${datos.error.message?.slice(0, 160) ?? ''}` : crudo.slice(0, 200);
    return { ok: false, canal: null, detalle: `Zavu ${r.status} ${motivo}`.trim() };
  } catch (e) {
    return { ok: false, canal: null, detalle: e instanceof Error ? `Zavu: ${e.message}` : 'Zavu: error de red' };
  }
}
