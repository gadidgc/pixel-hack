import { validarPerfil, type PerfilBloqueo } from './bloqueo';

/**
 * Validación del contrato de docs/PLAN.md §6.1 (lo que manda la app). El endpoint es público: todo lo que
 * llega se revisa antes de tocar la base de datos, y lo que no cumple se rechaza con un motivo claro.
 */

export interface Punto {
  t: number;
  lat: number;
  lon: number;
  velocidad: number | null;
  precision: number | null;
}

export interface Contacto {
  nombre: string;
  telefono: string;
}

export interface EventoAlerta {
  tJalon: number;
  via: string;
  confianza: string;
  velocidadMs: number | null;
  posicionJalon: Punto | null;
}

export type Mensaje =
  | {
      tipo: 'alerta';
      dispositivo: string;
      evento: EventoAlerta;
      ruta: Punto[];
      nombre: string;
      contactos: Contacto[];
      esperaS: number;
      /** iPhone: número del propio dueño, para mandarle el SMS que dispara su automatización de Atajos. */
      numeroPropio: string | null;
      bloqueo: PerfilBloqueo | null;
    }
  | { tipo: 'notificar_familia'; dispositivo: string; evento: EventoAlerta; nombre: string; contactos: Contacto[]; bloqueo: PerfilBloqueo | null }
  | { tipo: 'cancelada'; dispositivo: string }
  | { tipo: 'ubicacion'; dispositivo: string; lectura: Punto }
  | { tipo: 'prueba'; dispositivo: string; nombre: string; contactos: Contacto[] }
  | { tipo: 'motivo_falsa_alarma'; dispositivo: string; motivo: string }
  | { tipo: 'probar_bloqueo'; dispositivo: string; numeroPropio: string };

export class ErrorDeDatos extends Error {}

const MAX_CONTACTOS = 5;
const MAX_RUTA = 600;

function objeto(v: unknown, campo: string): Record<string, unknown> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new ErrorDeDatos(`"${campo}" debe ser un objeto`);
  return v as Record<string, unknown>;
}

function texto(v: unknown, campo: string, max: number, vacioPermitido = false): string {
  if (typeof v !== 'string') throw new ErrorDeDatos(`"${campo}" debe ser texto`);
  const limpio = v.trim().slice(0, max);
  if (!vacioPermitido && limpio.length === 0) throw new ErrorDeDatos(`"${campo}" está vacío`);
  return limpio;
}

function numero(v: unknown, campo: string, min: number, max: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) throw new ErrorDeDatos(`"${campo}" fuera de rango`);
  return v;
}

function numeroOpcional(v: unknown, campo: string, min: number, max: number): number | null {
  return v === null || v === undefined ? null : numero(v, campo, min, max);
}

export function punto(v: unknown, campo = 'lectura'): Punto {
  const o = objeto(v, campo);
  return {
    t: numero(o.t, `${campo}.t`, 0, 1e14),
    lat: numero(o.lat, `${campo}.lat`, -90, 90),
    lon: numero(o.lon, `${campo}.lon`, -180, 180),
    velocidad: numeroOpcional(o.velocidad, `${campo}.velocidad`, -1, 200),
    precision: numeroOpcional(o.precision, `${campo}.precision`, 0, 1e5),
  };
}

/** Teléfono en formato internacional. Para Perú aceptamos también 9 dígitos que empiezan con 9. */
export function normalizarTelefono(v: string): string | null {
  const digitos = v.replace(/[\s()-]/g, '');
  if (/^9\d{8}$/.test(digitos)) return `+51${digitos}`;
  if (/^\+\d{8,15}$/.test(digitos)) return digitos;
  if (/^51\d{9}$/.test(digitos)) return `+${digitos}`;
  return null;
}

function contactos(v: unknown): Contacto[] {
  if (!Array.isArray(v)) throw new ErrorDeDatos('"contactos" debe ser una lista');
  return v.slice(0, MAX_CONTACTOS).flatMap((c, i) => {
    const o = objeto(c, `contactos[${i}]`);
    const telefono = normalizarTelefono(texto(o.telefono, `contactos[${i}].telefono`, 30, true));
    // Un contacto sin teléfono válido no se puede avisar: lo saltamos en vez de rechazar toda la alerta.
    return telefono ? [{ nombre: texto(o.nombre, `contactos[${i}].nombre`, 40, true) || 'Contacto', telefono }] : [];
  });
}

function evento(v: unknown): EventoAlerta {
  const o = objeto(v, 'evento');
  return {
    tJalon: numero(o.tJalon, 'evento.tJalon', 0, 1e14),
    via: texto(o.via ?? 'desconocida', 'evento.via', 40),
    confianza: texto(o.confianza ?? 'media', 'evento.confianza', 20),
    velocidadMs: numeroOpcional(o.velocidadMs, 'evento.velocidadMs', -1, 200),
    posicionJalon: o.posicionJalon ? punto(o.posicionJalon, 'evento.posicionJalon') : null,
  };
}

export function validarMensaje(cuerpo: unknown): Mensaje {
  const o = objeto(cuerpo, 'cuerpo');
  const dispositivo = texto(o.dispositivo, 'dispositivo', 64);
  if (!/^[\w-]+$/.test(dispositivo)) throw new ErrorDeDatos('"dispositivo" tiene caracteres no permitidos');
  const nombre = () => texto(o.nombre ?? '', 'nombre', 40, true) || 'Tu contacto';
  switch (o.tipo) {
    case 'alerta': {
      if (!Array.isArray(o.ruta)) throw new ErrorDeDatos('"ruta" debe ser una lista');
      const ruta = o.ruta.slice(-MAX_RUTA).map((p, i) => punto(p, `ruta[${i}]`));
      // Espera de "¿Todo bien?" elegida en la app (10, 15 o 20 s). Versiones viejas no la mandan: 10 s.
      const esperaS = o.esperaS === undefined ? 10 : Math.round(numero(o.esperaS, 'esperaS', 5, 60));
      // Opcional: un número inválido no frena la alerta, solo se queda sin el SMS de bloqueo.
      const numeroPropio = typeof o.numeroPropio === 'string' ? normalizarTelefono(o.numeroPropio.slice(0, 30)) : null;
      // `bloqueo` (kit de bloqueo) es opcional y nunca rechaza la alerta: si viene mal, se ignora.
      return { tipo: 'alerta', dispositivo, evento: evento(o.evento), ruta, nombre: nombre(), contactos: contactos(o.contactos), esperaS, numeroPropio, bloqueo: validarPerfil(o.bloqueo) };
    }
    case 'notificar_familia':
      return { tipo: 'notificar_familia', dispositivo, evento: evento(o.evento), nombre: nombre(), contactos: contactos(o.contactos), bloqueo: validarPerfil(o.bloqueo) };
    case 'cancelada':
      return { tipo: 'cancelada', dispositivo };
    case 'ubicacion':
      return { tipo: 'ubicacion', dispositivo, lectura: punto(o.lectura) };
    case 'prueba':
      return { tipo: 'prueba', dispositivo, nombre: nombre(), contactos: contactos(o.contactos) };
    case 'motivo_falsa_alarma':
      return { tipo: 'motivo_falsa_alarma', dispositivo, motivo: texto(o.motivo, 'motivo', 80) };
    case 'probar_bloqueo': {
      const numeroPropio = normalizarTelefono(texto(o.numeroPropio, 'numeroPropio', 30));
      if (!numeroPropio) throw new ErrorDeDatos('"numeroPropio" no es un teléfono válido');
      return { tipo: 'probar_bloqueo', dispositivo, numeroPropio };
    }
    default:
      throw new ErrorDeDatos('"tipo" desconocido');
  }
}

/** +51 987 654 321 → +51 9•• ••• 321 (para el registro de envíos). */
export function enmascarar(telefono: string): string {
  return telefono.length <= 6 ? '•••' : `${telefono.slice(0, 4)}•• ••• ${telefono.slice(-3)}`;
}
