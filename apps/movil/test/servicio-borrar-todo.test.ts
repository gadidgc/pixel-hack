import { beforeEach, describe, expect, it, vi } from 'vitest';

/** "Borrar todo": las notas de Atomic Memory se borran antes que la llave; si no se puede, no se borra nada. */

const dobles = vi.hoisted(() => ({
  orden: [] as string[],
  notas: { ok: true, datos: null } as { ok: true; datos: null } | { ok: false; motivo: string },
  pinOk: true,
}));
vi.mock('react-native', () => ({ Platform: { OS: 'android' }, Vibration: { vibrate: vi.fn(), cancel: vi.fn() } }));
vi.mock('expo-keep-awake', () => ({ activateKeepAwakeAsync: vi.fn(), deactivateKeepAwake: vi.fn() }));
vi.mock('../src/bloqueo', () => ({ bloquearAlDetectar: vi.fn(), mostrarSobreBloqueo: vi.fn(), ocultarSobreBloqueo: vi.fn(), quitarBloqueoApps: vi.fn() }));
vi.mock('../src/alertas', () => ({ enviar: vi.fn(async () => ({ enviado: true, detalle: '' })), hayBackend: () => true }));
vi.mock('../src/notificaciones', () => ({ avisarTodoBien: vi.fn(), quitarAviso: async () => undefined, pedirPermisoNotificaciones: async () => true }));
vi.mock('../src/pin', () => ({
  hayPin: async () => true,
  verificarPin: async () => dobles.pinOk,
  borrarPin: async () => void dobles.orden.push('pin'),
}));
vi.mock('../src/preferencias', () => ({
  preferencias: () => ({ esperaFamiliaS: 10, nombre: 'Prueba', contactos: [], llaveMemoria: 'llave' }),
  perfilParaEnviar: () => null,
  guardarPreferencias: async () => undefined,
  borrarPreferencias: async () => void dobles.orden.push('preferencias'),
}));
vi.mock('../src/memoria', () => ({
  borrarTodasLasNotas: async () => {
    dobles.orden.push('notas');
    return dobles.notas;
  },
}));
vi.mock('../src/grabadora', () => ({ Grabadora: class {} }));
vi.mock('../src/sensores', () => ({ pedirPermisoSensores: async () => true, escucharSensores: vi.fn() }));
vi.mock('../src/ubicacion', () => ({ pedirPermisosUbicacion: vi.fn(), escucharUbicacion: vi.fn() }));

beforeEach(() => {
  vi.resetModules();
  dobles.orden = [];
  dobles.notas = { ok: true, datos: null };
  dobles.pinOk = true;
});

describe('borrarTodo', () => {
  it('borra primero las notas de Atomic Memory y después lo del celular', async () => {
    const { servicio } = await import('../src/servicio');
    expect(await servicio.borrarTodo('1234')).toBe(true);
    expect(dobles.orden).toEqual(['notas', 'pin', 'preferencias']);
    expect(servicio.motivoNoBorrado).toBeNull();
  });

  it('si las notas no se pueden borrar, no borra nada más y dice por qué', async () => {
    const { servicio } = await import('../src/servicio');
    dobles.notas = { ok: false, motivo: 'la memoria no confirmó que la borró' };
    expect(await servicio.borrarTodo('1234')).toBe(false);
    expect(dobles.orden).toEqual(['notas']);
    expect(servicio.motivoNoBorrado).toBe('Los datos de este celular siguen aquí. No pudimos completar el borrado de tus notas de falsas alarmas (la memoria no confirmó que la borró); algunas pueden haberse borrado. Conservamos el acceso para reintentar.');
  });

  it('con el PIN incorrecto no toca Atomic Memory', async () => {
    const { servicio } = await import('../src/servicio');
    dobles.pinOk = false;
    expect(await servicio.borrarTodo('0000')).toBe(false);
    expect(dobles.orden).toEqual([]);
    expect(servicio.motivoNoBorrado).toBeNull();
  });
});
