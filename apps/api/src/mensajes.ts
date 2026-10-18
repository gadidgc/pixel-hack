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
   * Texto para SMS. El filtro antifraude de Zavu bloquea los SMS que "parecen phishing" (una "PRUEBA" con un
   * enlace, por ejemplo): por SMS decimos quién lo manda y para qué, y solo ponemos enlace cuando hace falta.
   */
  sms: string;
  plantilla: { nombre: string; variables: string[] };
}

export const MENSAJES = {
  alerta: (nombre: string, t: number, enlace: string): Mensaje => ({
    texto: `ALERTA: posible robo del celular de ${nombre} a las ${horaLima(t)}. Probablemente ${nombre} esta bien. Ruta en vivo: ${enlace}`,
    // Sin enlace y sin "robo": el filtro antifraude de Zavu bloquea esos SMS como phishing. El detalle va por WhatsApp.
    sms: `Vigia: ${nombre} te tiene como contacto de emergencia y su app envio una alerta a las ${horaLima(t)}. Revisa tu WhatsApp para ver los detalles o llamale.`,
    plantilla: { nombre: 'alerta_arrebato', variables: [nombre, horaLima(t), enlace] },
  }),
  estaBien: (nombre: string): Mensaje => ({
    texto: `${nombre} confirmo con su PIN que esta bien: fue falsa alarma. Gracias por estar atento.`,
    sms: `Vigia: ${nombre} confirmo que esta bien, fue una falsa alarma. No tienes que hacer nada.`,
    plantilla: { nombre: 'alerta_arrebato_bien', variables: [nombre] },
  }),
  encargado: (quien: string, nombre: string, enlace: string): Mensaje => ({
    texto: `${quien} dijo que se encarga del robo del celular de ${nombre}. Ruta: ${enlace}`,
    sms: `Vigia: ${quien} se esta encargando de lo que le paso a ${nombre}. Los detalles te llegan por WhatsApp.`,
    plantilla: { nombre: 'alerta_arrebato_encargado', variables: [quien, nombre, enlace] },
  }),
  prueba: (nombre: string, enlace: string): Mensaje => ({
    texto: `PRUEBA de Vigia: ${nombre} te eligio como contacto de confianza. Si le arranchan el celular te llegara un mensaje asi, con su ruta: ${enlace}`,
    sms: `Vigia: ${nombre} te agrego como contacto de confianza en la app. Si algun dia le roban el celular, te avisaremos por aqui. No tienes que hacer nada.`,
    plantilla: { nombre: 'alerta_arrebato_prueba', variables: [nombre, enlace] },
  }),
};

/**
 * iPhone no deja que una app lo bloquee, pero Atajos sí: la dueña crea una automatización "Al recibir un mensaje
 * que contenga PALABRA_BLOQUEO → Bloquear pantalla". Al confirmar un arrebato le mandamos este SMS a SU número.
 * Sin enlace y sin "robo" (el filtro de Zavu). Si cambias la palabra, cambia también la guía de la app.
 */
export const PALABRA_BLOQUEO = 'AA-BLOQUEO';
export const SMS_BLOQUEO = `Vigia ${PALABRA_BLOQUEO}. Si no fuiste tu, ignora este mensaje.`;

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
  if (buenos.length) return { ok: true, canal: buenos.map((r) => r.canal).join(' + '), detalle: fallidos.length ? `enviado (falló: ${fallidos.join('; ')})` : 'enviado' };
  return { ok: false, canal: null, detalle: resultados.map((r) => r.detalle).join('; ') };
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
    const datos = (await r.json().catch(() => ({}))) as { message?: { channel?: string }; error?: { code?: string; message?: string } };
    // 409 = ya se mandó con esta misma clave (un reintento de la app): cuenta como enviado.
    if (r.status === 202 || r.status === 200 || r.status === 409) return { ok: true, canal: datos.message?.channel ?? canal, detalle: 'enviado' };
    return { ok: false, canal: null, detalle: `Zavu ${r.status} ${datos.error?.code ?? ''} ${datos.error?.message?.slice(0, 160) ?? ''}`.trim() };
  } catch (e) {
    return { ok: false, canal: null, detalle: e instanceof Error ? `Zavu: ${e.message}` : 'Zavu: error de red' };
  }
}
