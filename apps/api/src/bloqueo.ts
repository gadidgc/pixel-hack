/**
 * Kit de bloqueo: lo que ve el contacto cuando confirma que SÍ fue un robo. No bloquea nada por su cuenta
 * (los bancos y operadores verifican al titular por teléfono; no hay formulario): arma una lista de llamadas
 * con el número escrito y los datos que le van a pedir.
 *
 * Los números viven SOLO aquí, fijos y revisados contra su fuente. Nunca se buscan en internet durante un
 * robo: es lento y puede traer números falsos de bancos (una estafa conocida). Si un número cambia, se
 * corrige aquí con un PR y se actualiza `revisado`.
 */

export const ENTIDADES = {
  yape: 'Yape',
  plin: 'Plin',
  bcp: 'BCP',
  interbank: 'Interbank',
  bbva: 'BBVA',
  scotiabank: 'Scotiabank',
  otro_banco: 'Otro banco o caja',
} as const;
export type Entidad = keyof typeof ENTIDADES;

/**
 * Números para llamar DESDE OTRO TELÉFONO (el 104 o el 123 solo sirven desde una línea de la misma
 * operadora, y la de la víctima está en manos del ladrón).
 * Fuente: OSIPTEL citado por DPL News, dic. 2025 (https://dplnews.com/?p=300578).
 */
export const OPERADORES = {
  movistar: { nombre: 'Movistar', telefono: '0800 11800' },
  claro: { nombre: 'Claro', telefono: '0800 00123' },
  entel: { nombre: 'Entel', telefono: '(01) 611 7777' },
  bitel: { nombre: 'Bitel', telefono: '930 123 123' },
} as const;
export type Operador = keyof typeof OPERADORES;

/**
 * Línea de ASBANC: 24 h, conecta con el área de bloqueo de los 17 bancos privados. Para Yape lo recomienda El
 * Comercio (decir "Yape" al llamar); para Plin es una deducción nuestra (Plin va sobre Interbank, BBVA, Scotiabank…).
 */
export const LINEA_BANCOS = { telefono: '1820', fuente: 'https://gestion.pe/tu-dinero/finanzas-personales/asociacion-de-bancos-implementa-linea-1820-para-bloquear-tarjetas-robadas-robo-de-celulares-noticia/' };
export const DENUNCIA_DIGITAL = 'https://sistemas.policia.gob.pe/denuncias_digitales/';
export const CHECA_TU_IMEI = 'https://checatuimei.osiptel.gob.pe';
export const REVISADO = '2026-10-18';

/** Lo que la dueña guardó en la app para este momento. Todo es opcional; el DNI, solo si ella quiso. */
export interface PerfilBloqueo {
  entidades: Entidad[];
  operador: Operador | null;
  linea: string | null;
  imei: string | null;
  dni: string | null;
}

export const PASOS_KIT = ['bancos', 'operador', 'denuncia', 'verificar_imei'] as const;
export type PasoKit = (typeof PASOS_KIT)[number];

export interface ItemKit {
  paso: PasoKit;
  titulo: string;
  detalle: string;
  /** Para marcar a mano (siempre escrito: en algunas vistas el enlace `tel:` no abre el marcador). */
  telefono: string | null;
  enlace: string | null;
  /** Qué datos piden en esa llamada o trámite. */
  piden: string[];
}

function textoCorto(v: unknown, patron: RegExp): string | null {
  if (typeof v !== 'string') return null;
  const limpio = v.replace(/[\s.-]/g, '');
  return patron.test(limpio) ? limpio : null;
}

/**
 * Tolerante a propósito: un perfil raro o incompleto NUNCA debe tumbar la alerta. Lo que no cumple se
 * descarta campo por campo y, si no queda nada, devuelve `null`.
 */
export function validarPerfil(v: unknown): PerfilBloqueo | null {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  const entidades = Array.isArray(o.entidades) ? [...new Set(o.entidades.filter((e): e is Entidad => typeof e === 'string' && e in ENTIDADES))] : [];
  const operador = typeof o.operador === 'string' && o.operador in OPERADORES ? (o.operador as Operador) : null;
  const perfil: PerfilBloqueo = {
    entidades,
    operador,
    // Celular peruano: 9 dígitos que empiezan con 9 (con o sin +51).
    linea: textoCorto(o.linea, /^(\+?51)?9\d{8}$/)?.replace(/^\+?51/, '') ?? null,
    // IMEI: 15 dígitos (*#06#). Aceptamos 14 a 16 por si lo copian sin el dígito de control o con el de versión.
    imei: textoCorto(o.imei, /^\d{14,16}$/),
    // DNI (8 dígitos) o carné de extranjería (hasta 12).
    dni: textoCorto(o.dni, /^[0-9A-Za-z]{8,12}$/),
  };
  const vacio = !perfil.entidades.length && !perfil.operador && !perfil.linea && !perfil.imei && !perfil.dni;
  return vacio ? null : perfil;
}

export function leerPerfil(json: string | null): PerfilBloqueo | null {
  if (!json) return null;
  try {
    return validarPerfil(JSON.parse(json));
  } catch {
    return null;
  }
}

function lista(nombres: string[]): string {
  return nombres.length <= 1 ? (nombres[0] ?? '') : `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
}

/** La lista que ve el contacto, en el orden que recomienda OSIPTEL: bancos, operadora, denuncia, verificar. */
export function armarKit(perfil: PerfilBloqueo | null, nombre: string): ItemKit[] {
  const entidades = (perfil?.entidades ?? []).map((e) => ENTIDADES[e]);
  const operador = perfil?.operador ? OPERADORES[perfil.operador] : null;
  return [
    {
      paso: 'bancos',
      titulo: entidades.length ? `Bloquear ${lista(entidades)}` : 'Bloquear bancos, Yape y Plin',
      detalle: `Una llamada al 1820 (24 h) te conecta con el área de bloqueo de cada banco. Di el nombre del banco o "Yape" y pide bloquear las tarjetas y cuentas de ${nombre}.`,
      telefono: LINEA_BANCOS.telefono,
      enlace: null,
      piden: ['dni'],
    },
    {
      paso: 'operador',
      titulo: operador ? `Suspender la línea y el celular (${operador.nombre})` : 'Suspender la línea y el celular',
      detalle: operador
        ? 'Pide la suspensión de la línea por robo y el bloqueo del IMEI.'
        : `Llama a la operadora de ${nombre} (Movistar 0800 11800, Claro 0800 00123, Entel (01) 611 7777, Bitel 930 123 123). Pide la suspensión de la línea por robo y el bloqueo del IMEI.`,
      telefono: operador?.telefono ?? null,
      enlace: null,
      piden: ['linea', 'dni', 'imei'],
    },
    {
      paso: 'denuncia',
      titulo: 'Hacer la denuncia policial',
      detalle: 'La denuncia digital de la PNP acepta el robo de celulares, las 24 horas. Ten a mano la hora y el lugar del jalón.',
      telefono: null,
      enlace: DENUNCIA_DIGITAL,
      piden: ['dni', 'hora', 'lugar'],
    },
    {
      paso: 'verificar_imei',
      titulo: 'Confirmar que el celular quedó bloqueado',
      detalle: 'En "Checa tu IMEI" de OSIPTEL. Si a las 24 h no aparece como robado, vuelve a llamar a la operadora.',
      telefono: null,
      enlace: CHECA_TU_IMEI,
      piden: ['imei'],
    },
  ];
}

export function validarMarca(v: unknown): { paso: PasoKit; contacto: number; hecho: boolean } | null {
  if (typeof v !== 'object' || v === null) return null;
  const o = v as Record<string, unknown>;
  if (typeof o.paso !== 'string' || !(PASOS_KIT as readonly string[]).includes(o.paso)) return null;
  return {
    paso: o.paso as PasoKit,
    contacto: typeof o.contacto === 'number' && Number.isInteger(o.contacto) ? o.contacto : -1,
    // Solo `true` (o nada) es "hecho": "false", 0 o null no deben marcar un paso por error.
    hecho: o.hecho === undefined || o.hecho === true,
  };
}
