import {
  simular,
  type LecturaGps,
  type MuestraImu,
} from '@pixel-hack/detector';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const dobles = vi.hoisted(() => ({
  imu: null as null | ((m: MuestraImu) => void),
  gps: null as null | ((l: LecturaGps) => void),
  bloquear: vi.fn(),
  enviar: vi.fn(),
}));
vi.mock('react-native', () => ({ Platform: { OS: 'android' } }));
vi.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: vi.fn(),
  deactivateKeepAwake: vi.fn(),
}));
vi.mock('../src/bloqueo', () => ({ bloquearAlDetectar: dobles.bloquear }));
vi.mock('../src/alertas', () => ({
  enviar: dobles.enviar,
  hayBackend: () => true,
}));
vi.mock('../src/notificaciones', () => ({
  avisarTodoBien: async () => null,
  quitarAviso: async () => undefined,
  pedirPermisoNotificaciones: async () => true,
}));
vi.mock('../src/pin', () => ({
  hayPin: async () => true,
  verificarPin: async () => true,
}));
vi.mock('../src/preferencias', () => ({
  preferencias: () => ({ esperaFamiliaS: 10, nombre: 'Prueba', contactos: [] }),
  guardarPreferencias: async () => undefined,
}));
vi.mock('../src/grabadora', () => ({
  Grabadora: class {
    cantidad = 0;
    agregar() {}
  },
}));
vi.mock('../src/sensores', () => ({
  pedirPermisoSensores: async () => true,
  escucharSensores: async (f: (m: MuestraImu) => void) => {
    dobles.imu = f;
    return {
      detener: () => undefined,
      tieneGiroscopio: true,
      segundoPlano: true,
    };
  },
}));
vi.mock('../src/ubicacion', () => ({
  pedirPermisosUbicacion: async () => ({
    primerPlano: true,
    segundoPlano: true,
  }),
  escucharUbicacion: async (f: (l: LecturaGps) => void) => {
    dobles.gps = f;
    return () => undefined;
  },
}));
let servicio: (typeof import('../src/servicio'))['servicio'];
beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers();
  dobles.bloquear
    .mockReset()
    .mockReturnValue({ estado: 'solicitado', detalle: 'Orden recibida.' });
  dobles.enviar
    .mockReset()
    .mockResolvedValue({ enviado: true, detalle: 'Enviado.' });
  ({ servicio } = await import('../src/servicio'));
  expect(await servicio.activar()).toBe(true);
});
afterEach(async () => {
  await servicio.desactivar('1234');
  vi.useRealTimers();
});
function reproducirCaso(nombre: string) {
  for (const entrada of simular(nombre, 1).entradas) {
    if (entrada.tipo === 'imu') dobles.imu!(entrada.muestra);
    else dobles.gps!(entrada.lectura);
  }
}
describe('detector real conectado al bloqueo', () => {
  it('bloquea una vez sin esperar al servidor ni a los diez segundos', () => {
    dobles.enviar.mockImplementation(() => new Promise(() => {}));
    reproducirCaso('arrebato_moto');
    expect(dobles.bloquear).toHaveBeenCalledTimes(1);
    expect(servicio.obtener().alerta?.bloqueo?.estado).toBe('solicitado');
    expect(servicio.obtener().alerta?.panel).toBeNull();
    expect(servicio.obtener().alerta?.segundosParaFamilia).toBe(10);
  });
  it('una caída no bloquea aunque genere un posible jalón', () => {
    reproducirCaso('caida_al_piso');
    expect(
      servicio
        .obtener()
        .registros.some((r) => r.texto.includes('Posible jalón')),
    ).toBe(true);
    expect(dobles.bloquear).not.toHaveBeenCalled();
  });
  it('sin autorización sigue enviando la alerta y el aviso familiar', async () => {
    dobles.bloquear.mockReturnValue({
      estado: 'sin_autorizacion',
      detalle: 'Permiso revocado.',
    });
    reproducirCaso('arrebato_moto');
    await vi.advanceTimersByTimeAsync(10_000);
    const tipos = dobles.enviar.mock.calls.map(([m]) => m.tipo);
    expect(tipos).toContain('alerta');
    expect(tipos).toContain('notificar_familia');
    expect(servicio.obtener().alerta?.bloqueo?.estado).toBe('sin_autorizacion');
  });
  it('la prueba guiada no bloquea físicamente el teléfono', async () => {
    await servicio.probar();
    expect(dobles.bloquear).not.toHaveBeenCalled();
    expect(dobles.enviar).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'prueba' }),
    );
  });
  it('la pausa impide bloquear por movimientos', async () => {
    await servicio.pausar(30, '1234');
    reproducirCaso('arrebato_moto');
    expect(dobles.bloquear).not.toHaveBeenCalled();
  });
});
