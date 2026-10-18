import { beforeEach, describe, expect, it, vi } from 'vitest';

const entorno = vi.hoisted(() => ({
  plataforma: 'android',
  cargado: true,
  cargar: vi.fn(),
  modulo: {
    consultarEstado: vi.fn(),
    solicitarAutorizacion: vi.fn(),
    abrirBloqueoSeguro: vi.fn(),
    bloquearAhora: vi.fn(),
    abrirPermisoPantallaCompleta: vi.fn(),
    mostrarSobreBloqueo: vi.fn(),
    ocultarSobreBloqueo: vi.fn(),
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
beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  entorno.plataforma = 'android';
  entorno.cargado = true;
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
  it.each(['ios', 'web'])(
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
  it.each(['ios', 'web'])('%s no intenta mostrarse sobre el bloqueo', async (plataforma) => {
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
