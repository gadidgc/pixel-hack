import { beforeEach, describe, expect, it, vi } from 'vitest';

const entorno = vi.hoisted(() => ({
  plataforma: 'android',
  cargado: true,
  cargar: vi.fn(),
  /** `extra` de app.config.js (TestFlight pone `sinTiempoDeUso`). */
  extra: {} as Record<string, unknown>,
  modulo: {
    consultarEstado: vi.fn(),
    solicitarAutorizacion: vi.fn(),
    abrirBloqueoSeguro: vi.fn(),
    bloquearAhora: vi.fn(),
    abrirPermisoPantallaCompleta: vi.fn(),
    mostrarSobreBloqueo: vi.fn(),
    ocultarSobreBloqueo: vi.fn(),
    appsBloqueadas: vi.fn(),
    quitarBloqueoApps: vi.fn(),
  },
}));
vi.mock('react-native', () => ({
  Platform: {
    get OS() {
      return entorno.plataforma;
    },
  },
}));
vi.mock('expo', () => ({
  requireOptionalNativeModule: (nombre: string) => {
    entorno.cargar(nombre);
    return entorno.cargado ? entorno.modulo : null;
  },
}));
vi.mock('expo-constants', () => ({
  default: {
    get expoConfig() {
      return { extra: entorno.extra };
    },
  },
}));
beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  entorno.plataforma = 'android';
  entorno.cargado = true;
  entorno.extra = {};
  entorno.modulo.consultarEstado
    .mockReset()
    .mockReturnValue({
      disponible: true,
      administradorActivo: true,
      bloqueoSeguro: true,
      bloqueado: false,
      pantallaCompleta: true,
    });
  entorno.modulo.mostrarSobreBloqueo.mockReset().mockReturnValue(true);
  entorno.modulo.ocultarSobreBloqueo.mockReset();
  entorno.modulo.bloquearAhora
    .mockReset()
    .mockReturnValue({
      estado: 'solicitado',
      detalle: 'Orden enviada a Android.',
    });
  entorno.modulo.solicitarAutorizacion.mockReset().mockResolvedValue(true);
  entorno.modulo.abrirBloqueoSeguro.mockReset().mockResolvedValue(true);
});
describe('bloqueo por plataforma', () => {
  it.each(['web'])(
    '%s no carga el módulo ni finge un bloqueo',
    async (plataforma) => {
      entorno.plataforma = plataforma;
      const b = await import('../src/bloqueo');
      expect(b.consultarBloqueo().disponible).toBe(false);
      expect(b.bloquearAlDetectar().estado).toBe('no_disponible');
      expect(await b.solicitarAutorizacionBloqueo()).toBe(false);
      expect(entorno.cargar).not.toHaveBeenCalled();
      expect(entorno.modulo.bloquearAhora).not.toHaveBeenCalled();
    },
  );
  it('Expo Go informa que falta recompilar', async () => {
    entorno.cargado = false;
    const b = await import('../src/bloqueo');
    expect(b.consultarBloqueo().detalle).toContain('Expo Go');
    expect(b.bloquearAlDetectar().estado).toBe('no_disponible');
  });
  it('distingue una orden aceptada de una pantalla ya bloqueada', async () => {
    const b = await import('../src/bloqueo');
    expect(b.bloquearAlDetectar().estado).toBe('solicitado');
    expect(b.consultarBloqueo().bloqueado).toBe(false);
  });
  it.each(['sin_autorizacion', 'sin_clave', 'error'])(
    'conserva el resultado %s de Android',
    async (estado) => {
      entorno.modulo.bloquearAhora.mockReturnValue({
        estado,
        detalle: 'No se bloqueó.',
      });
      const b = await import('../src/bloqueo');
      expect(b.bloquearAlDetectar().estado).toBe(estado);
    },
  );
  it('un fallo nativo devuelve error en lugar de abortar la alerta', async () => {
    entorno.modulo.bloquearAhora.mockImplementation(() => {
      throw new Error('Permiso revocado');
    });
    const b = await import('../src/bloqueo');
    expect(b.bloquearAlDetectar().estado).toBe('error');
  });
  it('no marca autorización porque se haya abierto el diálogo', async () => {
    entorno.modulo.consultarEstado.mockReturnValue({
      disponible: true,
      administradorActivo: false,
      bloqueoSeguro: true,
      bloqueado: false,
    });
    const b = await import('../src/bloqueo');
    expect(await b.solicitarAutorizacionBloqueo()).toBe(true);
    expect(b.consultarBloqueo().administradorActivo).toBe(false);
  });
  it('los fallos al abrir ajustes se informan sin excepciones', async () => {
    entorno.modulo.abrirBloqueoSeguro.mockRejectedValue(
      new Error('No disponible'),
    );
    const b = await import('../src/bloqueo');
    expect(await b.abrirBloqueoSeguro()).toBe(false);
  });
});

describe('"¿Todo bien?" sobre la pantalla de bloqueo', () => {
  it('muestra la pregunta con los segundos que faltan', async () => {
    const b = await import('../src/bloqueo');
    expect(b.mostrarSobreBloqueo(15)).toBe(true);
    expect(entorno.modulo.mostrarSobreBloqueo).toHaveBeenCalledWith(
      '¿Todo bien?',
      expect.stringContaining('0:15'),
    );
  });
  it.each(['web'])('%s no intenta mostrarse sobre el bloqueo', async (plataforma) => {
    entorno.plataforma = plataforma;
    const b = await import('../src/bloqueo');
    expect(b.mostrarSobreBloqueo(10)).toBe(false);
    expect(b.pantallaBloqueada()).toBe(false);
  });
  it('un fallo nativo no rompe la alerta', async () => {
    entorno.modulo.mostrarSobreBloqueo.mockImplementation(() => {
      throw new Error('Sin actividad');
    });
    entorno.modulo.ocultarSobreBloqueo.mockImplementation(() => {
      throw new Error('Sin actividad');
    });
    const b = await import('../src/bloqueo');
    expect(b.mostrarSobreBloqueo(10)).toBe(false);
    expect(() => b.ocultarSobreBloqueo()).not.toThrow();
  });
  it('sin permiso de pantalla completa lo explica en Tú', async () => {
    entorno.modulo.consultarEstado.mockReturnValue({
      disponible: true,
      administradorActivo: true,
      bloqueoSeguro: true,
      bloqueado: false,
      pantallaCompleta: false,
    });
    const b = await import('../src/bloqueo');
    expect(b.consultarBloqueo().detalle).toContain('desbloquear para cancelar');
  });
  it('lee si Android está bloqueado', async () => {
    entorno.modulo.consultarEstado.mockReturnValue({
      disponible: true,
      administradorActivo: true,
      bloqueoSeguro: true,
      bloqueado: true,
      pantallaCompleta: true,
    });
    const b = await import('../src/bloqueo');
    expect(b.pantallaBloqueada()).toBe(true);
  });
});

describe('qué falta para bloquear (aviso en Inicio y en el ensayo)', () => {
  const listo = { disponible: true, administradorActivo: true, bloqueoSeguro: true, bloqueado: false, pantallaCompleta: true, detalle: '' };
  it('listo: no avisa nada', async () => {
    const b = await import('../src/bloqueo');
    expect(b.faltaParaBloqueo(listo)).toBeNull();
  });
  it('sin autorizar (lo que pasó en el Samsung): lo dice claro', async () => {
    const b = await import('../src/bloqueo');
    expect(b.faltaParaBloqueo({ ...listo, administradorActivo: false })).toContain('autorizar');
  });
  it('primero pide la clave de Android, que es lo que se necesita antes', async () => {
    const b = await import('../src/bloqueo');
    expect(b.faltaParaBloqueo({ ...listo, bloqueoSeguro: false, administradorActivo: false })).toContain('PIN, patrón');
  });
  it('sin permiso de pantalla completa también avisa', async () => {
    const b = await import('../src/bloqueo');
    expect(b.faltaParaBloqueo({ ...listo, pantallaCompleta: false })).toContain('sobre la pantalla de bloqueo');
  });
  it('iPhone o web: nada que arreglar aquí', async () => {
    const b = await import('../src/bloqueo');
    expect(b.faltaParaBloqueo({ ...listo, disponible: false })).toBeNull();
  });
});

describe('iPhone: tapar las apps con Tiempo de uso', () => {
  const estadoIphone = { disponible: true, administradorActivo: true, bloqueoSeguro: true, bloqueado: false, pantallaCompleta: false };
  beforeEach(() => {
    entorno.plataforma = 'ios';
    entorno.modulo.consultarEstado.mockReturnValue(estadoIphone);
  });
  it('carga el módulo y pide tapar las apps al confirmar un arrebato', async () => {
    const b = await import('../src/bloqueo');
    expect(entorno.cargar).toHaveBeenCalledWith('BloqueoPantalla');
    expect(b.bloquearAlDetectar().estado).toBe('solicitado');
    expect(entorno.modulo.bloquearAhora).toHaveBeenCalledTimes(1);
  });
  it('no dice que bloquea la pantalla: dice que tapa las apps', async () => {
    const b = await import('../src/bloqueo');
    expect(b.consultarBloqueo().detalle).toContain('taparemos las demás apps');
  });
  it('sin pantalla completa no es algo que falte: iPhone nunca lo deja', async () => {
    const b = await import('../src/bloqueo');
    expect(b.faltaParaBloqueo({ ...estadoIphone, detalle: '' }, '+51987654321')).toBeNull();
  });
  it('sin autorizar Tiempo de uso, Inicio lo avisa', async () => {
    const b = await import('../src/bloqueo');
    expect(b.faltaParaBloqueo({ ...estadoIphone, administradorActivo: false, detalle: '' }, '+51987654321')).toContain('Tiempo de uso');
  });
  it('sin código en el iPhone, lo pide primero', async () => {
    const b = await import('../src/bloqueo');
    expect(b.faltaParaBloqueo({ ...estadoIphone, bloqueoSeguro: false, administradorActivo: false, detalle: '' }, '+51987654321')).toContain('código');
  });
  it('sin número propio, lo primero que pide es el bloqueo con Atajos (también sin el módulo)', async () => {
    const b = await import('../src/bloqueo');
    expect(b.faltaParaBloqueo({ ...estadoIphone, detalle: '' })).toContain('Atajos');
    expect(b.faltaParaBloqueo({ ...estadoIphone, disponible: false, detalle: '' })).toContain('Atajos');
  });
  it('lee y quita el escudo; un fallo nativo no rompe nada', async () => {
    entorno.modulo.appsBloqueadas.mockReturnValue(true);
    const b = await import('../src/bloqueo');
    expect(b.appsBloqueadas()).toBe(true);
    b.quitarBloqueoApps();
    expect(entorno.modulo.quitarBloqueoApps).toHaveBeenCalledTimes(1);
    entorno.modulo.quitarBloqueoApps.mockImplementation(() => {
      throw new Error('Sin autorización');
    });
    expect(() => b.quitarBloqueoApps()).not.toThrow();
  });
  it('en Expo Go explica que hay que recompilar', async () => {
    entorno.cargado = false;
    const b = await import('../src/bloqueo');
    expect(b.consultarBloqueo().detalle).toContain('Expo Go');
    expect(b.appsBloqueadas()).toBe(false);
  });
});

describe('iPhone de TestFlight: compilado sin el permiso de Tiempo de uso', () => {
  beforeEach(() => {
    entorno.plataforma = 'ios';
    entorno.extra = { sinTiempoDeUso: true };
    // Lo que respondía el iPhone de TestFlight: disponible, pero nunca autorizable (el diálogo de Apple no sale).
    entorno.modulo.consultarEstado.mockReturnValue({ disponible: true, administradorActivo: false, bloqueoSeguro: true, bloqueado: false, pantallaCompleta: false });
  });
  it('no ofrece "Autorizar Tiempo de uso" y explica que falta la aprobación de Apple', async () => {
    const b = await import('../src/bloqueo');
    const estado = b.consultarBloqueo();
    expect(estado.disponible).toBe(false);
    expect(estado.detalle).toContain('Apple todavía no aprueba');
    expect(estado.detalle).toContain('Atajos');
    expect(await b.solicitarAutorizacionBloqueo()).toBe(false);
    expect(entorno.modulo.solicitarAutorizacion).not.toHaveBeenCalled();
  });
  it('Inicio no pide autorizar algo imposible: solo el bloqueo con Atajos', async () => {
    const b = await import('../src/bloqueo');
    const estado = b.consultarBloqueo();
    expect(b.faltaParaBloqueo(estado, '+51987654321')).toBeNull();
    expect(b.faltaParaBloqueo(estado)).toContain('Atajos');
  });
  it('una alerta no intenta tapar las apps y dice por qué', async () => {
    const b = await import('../src/bloqueo');
    const resultado = b.bloquearAlDetectar();
    expect(resultado.estado).toBe('no_disponible');
    expect(resultado.detalle).toContain('Tiempo de uso');
    expect(entorno.modulo.bloquearAhora).not.toHaveBeenCalled();
  });
  it('la marca no afecta a Android', async () => {
    entorno.plataforma = 'android';
    const b = await import('../src/bloqueo');
    expect(b.consultarBloqueo().disponible).toBe(true);
    expect(await b.solicitarAutorizacionBloqueo()).toBe(true);
  });
});
