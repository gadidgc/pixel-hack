/**
 * Mensajes a la red de confianza con Zavu (sponsor: una sola API para WhatsApp y SMS).
 * Docs: https://docs.zavu.dev/api-reference/send-a-message.md
 *
 * - `channel: "auto"`: Zavu elige WhatsApp si puede y si no, SMS (con `fallbackEnabled`).
 * - WhatsApp fuera de la ventana de 24 h exige una plantilla aprobada por Meta: si hay `ZAVU_PLANTILLA_ALERTA`,
 *   la alerta se manda con esa plantilla (variables 1 = nombre, 2 = hora, 3 = enlace).
 * - Sin `ZAVU_API_KEY` no se manda nada y lo decimos tal cual (la app muestra "no se pudo avisar").
 * - Con una clave de prueba (`zv_test_…`, el sandbox de Zavu) solo existe WhatsApp, desde el número de Zavu y
 *   solo a teléfonos del equipo: mandamos por WhatsApp y sin respaldo por SMS.
 * Los textos van sin tildes ni emojis: en SMS, una tilde baja el límite de 160 a 70 caracteres.
 */

export interface EnvMensajes {
  ZAVU_API_KEY?: string;
  ZAVU_PLANTILLA_ALERTA?: string;
}

export interface ResultadoMensaje {
  ok: boolean;
  canal: string | null;
  detalle: string;
}

export function hayProveedor(env: EnvMensajes): boolean {
  return Boolean(env.ZAVU_API_KEY);
}

/** Hora de Lima (HH:MM), que es la que entiende la familia. */
export function horaLima(t: number): string {
  return new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Lima' }).format(t);
}

export const TEXTOS = {
  alerta: (nombre: string, t: number, enlace: string) =>
    `ALERTA: posible robo del celular de ${nombre} a las ${horaLima(t)}. Probablemente ${nombre} esta bien. Ruta en vivo: ${enlace}`,
  estaBien: (nombre: string) => `${nombre} confirmo con su PIN que esta bien: fue falsa alarma. Gracias por estar atento.`,
  encargado: (quien: string, nombre: string, enlace: string) => `${quien} dijo que se encarga del robo del celular de ${nombre}. Ruta: ${enlace}`,
  prueba: (nombre: string, enlace: string) =>
    `PRUEBA de Alerta Arrebato: ${nombre} te eligio como contacto de confianza. Si le arranchan el celular te llegara un mensaje asi, con su ruta: ${enlace}`,
};

export async function mandarMensaje(
  env: EnvMensajes,
  a: { telefono: string; texto: string; idempotencia: string; plantilla?: Record<string, string> },
): Promise<ResultadoMensaje> {
  if (!env.ZAVU_API_KEY) return { ok: false, canal: null, detalle: 'falta configurar Zavu, el servicio de WhatsApp y SMS' };
  // Al pegar la clave a veces se cuela un espacio o un salto de línea.
  const clave = env.ZAVU_API_KEY.trim();
  const sandbox = clave.startsWith('zv_test_');
  const cuerpo =
    sandbox
      ? { to: a.telefono, channel: 'whatsapp', text: a.texto }
      : a.plantilla && env.ZAVU_PLANTILLA_ALERTA
      ? { to: a.telefono, messageType: 'template', content: { templateId: env.ZAVU_PLANTILLA_ALERTA, templateVariables: a.plantilla } }
      : { to: a.telefono, channel: 'auto', text: a.texto };
  try {
    const r = await fetch('https://api.zavu.dev/v1/messages', {
      method: 'POST',
      headers: { Authorization: `Bearer ${clave}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...cuerpo, fallbackEnabled: !sandbox, idempotencyKey: a.idempotencia }),
      signal: AbortSignal.timeout(8000),
    });
    const datos = (await r.json().catch(() => ({}))) as { message?: { channel?: string }; error?: { code?: string; message?: string } };
    // 409 = ya se mandó con esta misma clave (un reintento de la app): cuenta como enviado.
    if (r.status === 202 || r.status === 200 || r.status === 409) return { ok: true, canal: datos.message?.channel ?? null, detalle: 'enviado' };
    return { ok: false, canal: null, detalle: `Zavu ${r.status} ${datos.error?.code ?? ''}`.trim() };
  } catch (e) {
    return { ok: false, canal: null, detalle: e instanceof Error ? `Zavu: ${e.message}` : 'Zavu: error de red' };
  }
}
