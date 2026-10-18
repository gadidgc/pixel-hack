import { describe, expect, it } from 'vitest';
import { TEXTOS } from '../src/mensajes';
import { ErrorDeDatos, enmascarar, normalizarTelefono, validarMensaje } from '../src/validar';

const evento = { tJalon: 1760740000000, via: 'velocidad_gps', confianza: 'alta', velocidadMs: 9.1, posicionJalon: { lat: -12.1, lon: -77.03, precision: 8, t: 1760740000000 } };

describe('validarMensaje', () => {
  it('acepta una alerta del contrato y normaliza los teléfonos peruanos', () => {
    const m = validarMensaje({
      dispositivo: 'android-k3j9x2ab',
      tipo: 'alerta',
      evento,
      ruta: [{ t: 1, lat: -12.1, lon: -77.03, velocidad: 1.2, precision: 6 }],
      nombre: 'Lucía',
      contactos: [{ nombre: 'Mamá', telefono: '987 654 321' }, { nombre: 'Sin número', telefono: '' }],
    });
    expect(m.tipo).toBe('alerta');
    if (m.tipo !== 'alerta') return;
    expect(m.contactos).toEqual([{ nombre: 'Mamá', telefono: '+51987654321' }]);
    expect(m.ruta).toHaveLength(1);
  });

  it('rechaza coordenadas imposibles, tipos desconocidos y dispositivos raros', () => {
    expect(() => validarMensaje({ dispositivo: 'x', tipo: 'ubicacion', lectura: { t: 1, lat: 200, lon: 0 } })).toThrow(ErrorDeDatos);
    expect(() => validarMensaje({ dispositivo: 'x', tipo: 'borrar_todo' })).toThrow(ErrorDeDatos);
    expect(() => validarMensaje({ dispositivo: "x'; DROP TABLE", tipo: 'cancelada' })).toThrow(ErrorDeDatos);
  });

  it('limita la cantidad de contactos', () => {
    const contactos = Array.from({ length: 9 }, (_, i) => ({ nombre: `C${i}`, telefono: `+5198765432${i}` }));
    const m = validarMensaje({ dispositivo: 'x', tipo: 'prueba', nombre: 'A', contactos });
    expect(m.tipo === 'prueba' && m.contactos.length).toBe(5);
  });
});

describe('teléfonos y textos', () => {
  it('normaliza y enmascara', () => {
    expect(normalizarTelefono('+51 987-654-321')).toBe('+51987654321');
    expect(normalizarTelefono('51987654321')).toBe('+51987654321');
    expect(normalizarTelefono('123')).toBeNull();
    expect(enmascarar('+51987654321')).toBe('+519•• ••• 321');
  });

  it('el SMS de alerta va sin tildes (GSM-7, 160 caracteres por parte) y con la hora de Lima', () => {
    const t = Date.UTC(2026, 9, 18, 0, 42); // 19:42 en Lima (UTC-5)
    const texto = TEXTOS.alerta('Lucia', t, 'https://alerta-arrebato.workers.dev/a/abcdefghijkmnpqr?c=0');
    expect(texto).toContain('19:42');
    expect(/[áéíóúñ¿¡]/i.test(texto)).toBe(false);
  });
});
