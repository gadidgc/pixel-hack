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
  mostrar: vi.fn(),
  ocultar: vi.fn(),
  quitarApps: vi.fn(),
  avisar: vi.fn(),
  pinOk: true,
  enviar: vi.fn(),
}));
vi.mock('react-native', () => ({ Platform: { OS: 'android' } }));
vi.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: vi.fn(),
  deactivateKeepAwake: vi.fn(),
}));
vi.mock('../src/bloqueo', () => ({
  bloquearAlDetectar: dobles.bloquear,
  mostrarSobreBloqueo: dobles.mostrar,
  ocultarSobreBloqueo: dobles.ocultar,
  quitarBloqueoApps: dobles.quitarApps,
}));
vi.mock('../src/alertas', () => ({
  enviar: dobles.enviar,
  hayBackend: () => true,
}));
vi.mock('../src/notificaciones', () => ({
  avisarTodoBien: dobles.avisar,
  quitarAviso: async () => undefined,
  pedirPermisoNotificaciones: async () => true,
}));
vi.mock('../src/pin', () => ({
  hayPin: async () => true,
  verificarPin: async () => dobles.pinOk,
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
  dobles.mostrar.mockReset().mockReturnValue(true);
  dobles.ocultar.mockReset();
  dobles.quitarApps.mockReset();
  dobles.avisar.mockReset().mockResolvedValue(null);
  dobles.pinOk = true;
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

describe('"¿Todo bien?" sobre la pantalla de bloqueo', () => {
  it('tras bloquear, muestra la pregunta encima del bloqueo y no repite la notificación', () => {
    reproducirCaso('arrebato_moto');
    expect(dobles.mostrar).toHaveBeenCalledTimes(1);
    expect(dobles.mostrar).toHaveBeenCalledWith(10);
    expect(servicio.obtener().alerta?.sobreBloqueo).toBe(true);
    expect(dobles.avisar).not.toHaveBeenCalled();
  });
  it('bloquea antes de mostrar la pregunta (el orden importa: primero proteger)', () => {
    reproducirCaso('arrebato_moto');
    expect(dobles.bloquear.mock.invocationCallOrder[0]).toBeLessThan(
      dobles.mostrar.mock.invocationCallOrder[0],
    );
  });
  it('sin bloqueo (falta autorización) no se muestra sobre el bloqueo y avisa como antes', () => {
    dobles.bloquear.mockReturnValue({ estado: 'sin_autorizacion', detalle: 'Falta.' });
    reproducirCaso('arrebato_moto');
    expect(dobles.mostrar).not.toHaveBeenCalled();
    expect(servicio.obtener().alerta?.sobreBloqueo).toBe(false);
    expect(dobles.avisar).toHaveBeenCalledWith(10);
  });
  it('si Android no deja la pantalla completa, lo registra y usa la notificación normal', () => {
    dobles.mostrar.mockReturnValue(false);
    reproducirCaso('arrebato_moto');
    expect(servicio.obtener().alerta?.sobreBloqueo).toBe(false);
    expect(dobles.avisar).toHaveBeenCalled();
    expect(
      servicio.obtener().registros.some((r) => r.texto.includes('no deja mostrar')),
    ).toBe(true);
  });
  it('el PIN correcto cancela y devuelve la pantalla de bloqueo de Android', async () => {
    reproducirCaso('arrebato_moto');
    expect(await servicio.cancelarAlerta('1234')).toBe(true);
    expect(servicio.obtener().alerta).toBeNull();
    expect(dobles.ocultar).toHaveBeenCalledTimes(1);
    // iPhone: la falsa alarma también destapa las apps.
    expect(dobles.quitarApps).toHaveBeenCalledTimes(1);
  });
  it('un PIN incorrecto deja la alerta y la pregunta encima del bloqueo', async () => {
    dobles.pinOk = false;
    reproducirCaso('arrebato_moto');
    expect(await servicio.cancelarAlerta('0000')).toBe(false);
    expect(servicio.obtener().alerta?.sobreBloqueo).toBe(true);
    expect(dobles.ocultar).not.toHaveBeenCalled();
  });
  it('tras avisar a la red sigue encima del bloqueo para poder decir "estoy bien"', async () => {
    reproducirCaso('arrebato_moto');
    await vi.advanceTimersByTimeAsync(10_000);
    expect(servicio.obtener().alerta?.familia).toBe('avisada');
    expect(dobles.ocultar).not.toHaveBeenCalled();
    servicio.descartarPantallaAlerta();
    expect(dobles.ocultar).toHaveBeenCalledTimes(1);
    // Robo de verdad: en iPhone las apps siguen tapadas hasta que la dueña escriba su PIN.
    expect(dobles.quitarApps).not.toHaveBeenCalled();
  });
});

describe('respaldos del bloqueo', () => {
  it('sin pregunta sobre el bloqueo da 15 s más antes de avisar a la red', async () => {
    dobles.mostrar.mockReturnValue(false);
    reproducirCaso('arrebato_moto');
    expect(servicio.obtener().alerta?.segundosParaFamilia).toBe(25);
    expect(dobles.avisar).toHaveBeenCalledWith(25);
    expect(dobles.enviar).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'alerta', esperaS: 25 }));
    await vi.advanceTimersByTimeAsync(10_000);
    expect(servicio.obtener().alerta?.familia).toBe('esperando');
    await vi.advanceTimersByTimeAsync(15_000);
    expect(servicio.obtener().alerta?.familia).toBe('avisada');
  });
  it('con la pregunta sobre el bloqueo respeta la espera elegida', () => {
    reproducirCaso('arrebato_moto');
    expect(servicio.obtener().alerta?.segundosParaFamilia).toBe(10);
  });
  it('sin bloqueo no agrega espera', () => {
    dobles.bloquear.mockReturnValue({ estado: 'sin_autorizacion', detalle: 'Falta.' });
    dobles.mostrar.mockReturnValue(false);
    reproducirCaso('arrebato_moto');
    expect(servicio.obtener().alerta?.segundosParaFamilia).toBe(10);
  });
  it('tras 5 PIN incorrectos hace esperar 30 s, aunque el siguiente sea el correcto', async () => {
    dobles.pinOk = false;
    reproducirCaso('arrebato_moto');
    for (let i = 0; i < 5; i++) expect(await servicio.cancelarAlerta('0000')).toBe(false);
    expect(servicio.mensajePin()).toContain('Espera 30 s');
    dobles.pinOk = true;
    expect(await servicio.cancelarAlerta('1234')).toBe(false);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(servicio.mensajePin()).toBeNull();
    expect(await servicio.cancelarAlerta('1234')).toBe(true);
  });
  it('4 PIN incorrectos no hacen esperar', async () => {
    dobles.pinOk = false;
    reproducirCaso('arrebato_moto');
    for (let i = 0; i < 4; i++) await servicio.cancelarAlerta('0000');
    expect(servicio.mensajePin()).toBeNull();
  });
});

describe('ensayo de la alerta completa (Herramientas)', () => {
  it('en 5 s dispara una alerta real que bloquea y pregunta sobre el bloqueo', async () => {
    expect(servicio.ensayarAlertaCompleta(5)).toBe(true);
    await vi.advanceTimersByTimeAsync(4_900);
    expect(dobles.bloquear).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(200);
    expect(dobles.bloquear).toHaveBeenCalledTimes(1);
    expect(dobles.mostrar).toHaveBeenCalledTimes(1);
    const alerta = servicio.obtener().alerta!;
    expect(Math.abs(alerta.evento.t - Date.now())).toBeLessThan(1_000);
    expect(alerta.evento.t).toBeGreaterThan(alerta.evento.tJalon);
    expect(dobles.enviar).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'alerta' }));
  });
  it('con los temporizadores congelados (segundo plano) dispara con el siguiente lote de sensores', async () => {
    vi.spyOn(globalThis, 'setTimeout').mockImplementation((() => 0) as never);
    expect(servicio.ensayarAlertaCompleta(5)).toBe(true);
    vi.setSystemTime(Date.now() + 5_100);
    dobles.imu!({ t: Date.now(), ax: 0, ay: 0, az: 9.81, gx: 0, gy: 0, gz: 0 });
    expect(dobles.bloquear).toHaveBeenCalledTimes(1);
    vi.mocked(globalThis.setTimeout).mockRestore();
  });
  it('no ensaya con una alerta en curso', () => {
    reproducirCaso('arrebato_moto');
    expect(servicio.ensayarAlertaCompleta(5)).toBe(false);
  });
});

describe('cancelar llega siempre al servidor (que cuenta por su lado)', () => {
  const tipos = () => dobles.enviar.mock.calls.map(([m]) => m.tipo);
  it('ensayo cancelado a tiempo: el servidor recibe "cancelada" y no avisa a la red', async () => {
    servicio.ensayarAlertaCompleta(5);
    await vi.advanceTimersByTimeAsync(5_100);
    expect(await servicio.cancelarAlerta('1234')).toBe(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(tipos()).toContain('cancelada');
    await vi.advanceTimersByTimeAsync(30_000);
    expect(tipos()).not.toContain('notificar_familia');
  });
  it('cancelar antes de que responda el envío de la alerta: "cancelada" sale después, no antes', async () => {
    let responder!: (r: { enviado: boolean; detalle: string }) => void;
    dobles.enviar.mockImplementation((m: { tipo: string }) =>
      m.tipo === 'alerta' ? new Promise((r) => (responder = r)) : Promise.resolve({ enviado: true, detalle: 'ok' }),
    );
    reproducirCaso('arrebato_moto');
    await servicio.cancelarAlerta('1234');
    await vi.advanceTimersByTimeAsync(0);
    expect(tipos()).not.toContain('cancelada');
    responder({ enviado: true, detalle: 'ok' });
    await vi.advanceTimersByTimeAsync(0);
    expect(tipos()).toContain('cancelada');
  });
  it('los PIN incorrectos de una alerta anterior no bloquean la siguiente', async () => {
    dobles.pinOk = false;
    reproducirCaso('arrebato_moto');
    for (let i = 0; i < 5; i++) await servicio.cancelarAlerta('0000');
    expect(servicio.mensajePin()).not.toBeNull();
    servicio.descartarPantallaAlerta();
    await vi.advanceTimersByTimeAsync(31_000);
    servicio.descartarPantallaAlerta();
    servicio.ensayarAlertaCompleta(1);
    await vi.advanceTimersByTimeAsync(1_100);
    await servicio.cancelarAlerta('0000');
    expect(servicio.mensajePin()).toBeNull();
  });
});
