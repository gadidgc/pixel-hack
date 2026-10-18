import type { LecturaGps, LecturaLlave, MuestraImu } from '@pixel-hack/detector';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Robo silencioso con la llave Bluetooth, conectado al servicio con adaptadores simulados: el vigilante
 * real (packages/detector) recibe lecturas de RSSI inventadas. No prueba el Bluetooth de un celular real.
 */
const dobles = vi.hoisted(() => ({
  imu: null as null | ((m: MuestraImu) => void),
  llave: null as null | ((l: LecturaLlave) => void),
  escuchar: vi.fn(),
  detenerEscaneo: vi.fn(),
  bloquear: vi.fn(),
  mostrar: vi.fn(),
  enviar: vi.fn(),
  pinOk: true,
  prefs: {} as Record<string, unknown>,
}));
vi.mock('react-native', () => ({ Platform: { OS: 'android' } }));
vi.mock('expo-keep-awake', () => ({ activateKeepAwakeAsync: vi.fn(), deactivateKeepAwake: vi.fn() }));
vi.mock('../src/bloqueo', () => ({ bloquearAlDetectar: dobles.bloquear, mostrarSobreBloqueo: dobles.mostrar, ocultarSobreBloqueo: vi.fn() }));
vi.mock('../src/alertas', () => ({ enviar: dobles.enviar, hayBackend: () => true }));
vi.mock('../src/notificaciones', () => ({ avisarTodoBien: async () => null, quitarAviso: async () => undefined, pedirPermisoNotificaciones: async () => true }));
vi.mock('../src/pin', () => ({ hayPin: async () => true, verificarPin: async () => dobles.pinOk }));
vi.mock('../src/preferencias', () => ({
  preferencias: () => dobles.prefs,
  guardarPreferencias: async (cambios: Record<string, unknown>) => Object.assign(dobles.prefs, cambios),
}));
vi.mock('../src/grabadora', () => ({ Grabadora: class { cantidad = 0; agregar() {} } }));
vi.mock('../src/sensores', () => ({
  pedirPermisoSensores: async () => true,
  escucharSensores: async (f: (m: MuestraImu) => void) => {
    dobles.imu = f;
    return { detener: () => undefined, tieneGiroscopio: true, segundoPlano: true };
  },
}));
vi.mock('../src/ubicacion', () => ({
  pedirPermisosUbicacion: async () => ({ primerPlano: true, segundoPlano: true }),
  escucharUbicacion: async (_f: (l: LecturaGps) => void) => () => undefined,
}));
vi.mock('../src/llave', () => ({ escucharLlave: dobles.escuchar }));

const A1M = -60;
/** RSSI a `d` metros con el modelo del vigilante (exponente 2,5). */
const rssiA = (d: number) => A1M - 25 * Math.log10(d);

let servicio: (typeof import('../src/servicio'))['servicio'];

/** Pasa `ms` de tiempo: sensores cada 100 ms y, si `metros` no es `null`, una lectura de la llave. */
function pasar(ms: number, metros: number | null) {
  for (let i = 0; i < ms; i += 100) {
    vi.setSystemTime(Date.now() + 100);
    if (metros !== null) dobles.llave?.({ t: Date.now(), rssi: rssiA(metros) });
    dobles.imu!({ t: Date.now(), ax: 0, ay: 0, az: 9.81, gx: 0, gy: 0, gz: 0 });
  }
}

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers();
  dobles.prefs = { esperaFamiliaS: 10, nombre: 'Prueba', contactos: [], llave: { codigo: '4821', rssiA1m: A1M }, llaveIgnoradaHasta: null };
  dobles.pinOk = true;
  dobles.llave = null;
  dobles.detenerEscaneo.mockReset();
  dobles.escuchar.mockReset().mockImplementation(async (_codigo: string, f: (l: LecturaLlave) => void) => {
    dobles.llave = f;
    return () => {
      dobles.llave = null;
      dobles.detenerEscaneo();
    };
  });
  dobles.bloquear.mockReset().mockReturnValue({ estado: 'solicitado', detalle: 'Orden recibida.' });
  dobles.mostrar.mockReset().mockReturnValue(true);
  dobles.enviar.mockReset().mockResolvedValue({ enviado: true, detalle: 'Enviado.' });
  ({ servicio } = await import('../src/servicio'));
  expect(await servicio.activar()).toBe(true);
  servicio.cambiarModoDemo(true); // 5 m durante 5 s
});
afterEach(async () => {
  await servicio.desactivar('1234');
  vi.useRealTimers();
});

describe('robo silencioso: el celular se aleja de la llave', () => {
  it('al activar la protección empieza a escuchar la llave vinculada', () => {
    expect(dobles.escuchar).toHaveBeenCalledWith('4821', expect.any(Function), expect.any(Function));
    expect(servicio.obtener().llave?.modo).toBe('vigilando');
  });

  it('más de 5 m durante 5 s: bloquea, pregunta "¿Todo bien?" y avisa al panel', async () => {
    pasar(3_000, 1);
    await vi.advanceTimersByTimeAsync(250); // la telemetría se refresca cada 250 ms
    expect(servicio.obtener().llave?.telemetria?.estado).toBe('cerca');
    pasar(4_000, 12);
    expect(dobles.bloquear).not.toHaveBeenCalled();
    pasar(4_000, 12);
    expect(dobles.bloquear).toHaveBeenCalledTimes(1);
    const alerta = servicio.obtener().alerta!;
    expect(alerta.evento.via).toBe('separacion_llave');
    expect(alerta.evento.t - alerta.evento.tJalon).toBeGreaterThanOrEqual(5_000);
    expect(dobles.mostrar).toHaveBeenCalledWith(10, 'Tu celular se alejó de tu llave.');
    expect(dobles.enviar).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'alerta' }));
  });

  it('se pierde la señal de la llave: también alerta', () => {
    pasar(3_000, 1);
    pasar(9_000, null); // 3 s sin señal + 5 s lejos
    expect(servicio.obtener().alerta?.evento.via).toBe('separacion_llave');
  });

  it('si la llave vuelve antes de 5 s, no pasa nada', () => {
    pasar(3_000, 1);
    pasar(3_500, 12);
    pasar(10_000, 1);
    expect(servicio.obtener().alerta).toBeNull();
    expect(dobles.bloquear).not.toHaveBeenCalled();
  });

  it('"Estoy bien" con la llave todavía lejos no vuelve a alertar hasta verla cerca', async () => {
    pasar(3_000, 1);
    pasar(9_000, 12);
    expect(await servicio.cancelarAlerta('1234')).toBe(true);
    pasar(20_000, 12);
    expect(servicio.obtener().alerta).toBeNull();
    // La llave vuelve y otra vez se aleja: sí alerta.
    pasar(3_000, 1);
    pasar(9_000, 12);
    expect(servicio.obtener().alerta?.evento.via).toBe('separacion_llave');
  });

  it('un PIN incorrecto no cancela ni deja de vigilar la llave', async () => {
    dobles.pinOk = false;
    pasar(3_000, 1);
    pasar(9_000, 12);
    expect(await servicio.cancelarAlerta('0000', { olvideLaLlave: true })).toBe(false);
    expect(servicio.obtener().alerta).not.toBeNull();
    expect(dobles.prefs.llaveIgnoradaHasta).toBeNull();
    dobles.pinOk = true;
  });

  it('en pausa no alerta', async () => {
    await servicio.pausar(30, '1234');
    pasar(3_000, 1);
    pasar(10_000, 12);
    expect(servicio.obtener().alerta).toBeNull();
  });
});

describe('"Olvidé mi llave"', () => {
  it('cancela con el PIN y deja de vigilar la llave 8 h; luego vuelve sola', async () => {
    pasar(3_000, 1);
    pasar(9_000, 12);
    const antes = Date.now();
    expect(await servicio.cancelarAlerta('1234', { olvideLaLlave: true })).toBe(true);
    expect(servicio.obtener().alerta).toBeNull();
    expect(dobles.detenerEscaneo).toHaveBeenCalled();
    expect(servicio.obtener().llave?.modo).toBe('ignorada');
    expect(dobles.prefs.llaveIgnoradaHasta).toBe(antes + 8 * 3_600_000);

    // 7 h 59 min después: sigue sin vigilar aunque la llave esté lejos.
    vi.setSystemTime(antes + 8 * 3_600_000 - 60_000);
    pasar(10_000, null);
    expect(servicio.obtener().llave?.modo).toBe('ignorada');
    expect(dobles.escuchar).toHaveBeenCalledTimes(1);

    // Pasaron las 8 h: con el siguiente lote de sensores vuelve a escuchar la llave.
    vi.setSystemTime(antes + 8 * 3_600_000 + 1_000);
    pasar(100, null);
    await vi.advanceTimersByTimeAsync(0);
    expect(dobles.escuchar).toHaveBeenCalledTimes(2);
    expect(servicio.obtener().llave?.modo).toBe('vigilando');
    expect(dobles.prefs.llaveIgnoradaHasta).toBeNull();
  });

  it('"Volver a usar la llave" antes de las 8 h', async () => {
    pasar(3_000, 1);
    pasar(9_000, 12);
    await servicio.cancelarAlerta('1234', { olvideLaLlave: true });
    await servicio.volverAUsarLlave();
    expect(servicio.obtener().llave?.modo).toBe('vigilando');
    expect(dobles.escuchar).toHaveBeenCalledTimes(2);
  });

  it('la protección contra arrebatos sigue mientras la llave está ignorada', async () => {
    pasar(3_000, 1);
    pasar(9_000, 12);
    await servicio.cancelarAlerta('1234', { olvideLaLlave: true });
    expect(servicio.obtener().activa).toBe(true);
    servicio.ensayarAlertaCompleta(1);
    await vi.advanceTimersByTimeAsync(1_100);
    expect(servicio.obtener().alerta?.evento.via).not.toBe('separacion_llave');
  });
});

describe('vincular y fallos del Bluetooth', () => {
  it('vincular calibra con la mediana de la señal a 1 m y guarda la llave', async () => {
    const promesa = servicio.vincularLlave('0042');
    await vi.advanceTimersByTimeAsync(0);
    for (const rssi of [-55, -57, -56, -90, -56]) dobles.llave!({ t: Date.now(), rssi });
    await vi.advanceTimersByTimeAsync(4_000);
    const r = await promesa;
    expect(r.ok).toBe(true);
    expect(dobles.prefs.llave).toEqual({ codigo: '0042', rssiA1m: -56 });
    expect(dobles.escuchar).toHaveBeenLastCalledWith('0042', expect.any(Function), expect.any(Function));
  });

  it('si no aparece la llave al vincular, no guarda nada y lo explica', async () => {
    const promesa = servicio.vincularLlave('9999');
    await vi.advanceTimersByTimeAsync(4_000);
    const r = await promesa;
    expect(r.ok).toBe(false);
    expect(r.detalle).toContain('No encontramos tu llave');
    expect(dobles.prefs.llave).toEqual({ codigo: '4821', rssiA1m: A1M });
  });

  it('con el Bluetooth apagado la protección se activa igual y lo avisa', async () => {
    await servicio.desactivar('1234');
    dobles.escuchar.mockRejectedValue(new Error('Prende el Bluetooth para vigilar tu llave.'));
    expect(await servicio.activar()).toBe(true);
    expect(servicio.obtener().llave?.modo).toBe('sin_bluetooth');
    expect(servicio.obtener().llave?.detalle).toContain('Prende el Bluetooth');
  });

  it('desvincular exige el PIN', async () => {
    dobles.pinOk = false;
    expect(await servicio.desvincularLlave('0000')).toBe(false);
    expect(servicio.obtener().llave).not.toBeNull();
    dobles.pinOk = true;
    expect(await servicio.desvincularLlave('1234')).toBe(true);
    expect(servicio.obtener().llave).toBeNull();
    expect(dobles.prefs.llave).toBeNull();
  });
});
