import { describe, expect, it } from 'vitest';
import { armarKit, leerPerfil, validarMarca, validarPerfil } from '../src/bloqueo';
import { validarMensaje } from '../src/validar';

const evento = { tJalon: 1760740000000, via: 'velocidad_gps', confianza: 'alta', velocidadMs: 9.1, posicionJalon: null };

describe('validarPerfil', () => {
  it('acepta un perfil completo y limpia espacios y el +51', () => {
    const p = validarPerfil({ entidades: ['yape', 'bcp', 'yape'], operador: 'claro', linea: '+51 987 654 321', imei: '35-123456-789012-3', dni: '4567 8912' });
    expect(p).toEqual({ entidades: ['yape', 'bcp'], operador: 'claro', linea: '987654321', imei: '351234567890123', dni: '45678912' });
  });

  it('el DNI es opcional', () => {
    expect(validarPerfil({ entidades: ['plin'], operador: 'movistar', linea: '987654321', imei: '', dni: '' })).toMatchObject({ dni: null, imei: null });
  });

  it('descarta campo por campo lo que no cumple, sin lanzar errores', () => {
    const p = validarPerfil({ entidades: ['banco_falso', 'bbva'], operador: 'telefonica_x', linea: '12345', imei: 'abc', dni: "1'; DROP" });
    expect(p).toEqual({ entidades: ['bbva'], operador: null, linea: null, imei: null, dni: null });
  });

  it('un perfil vacío o raro es null', () => {
    expect(validarPerfil(undefined)).toBeNull();
    expect(validarPerfil('hola')).toBeNull();
    expect(validarPerfil({ entidades: [] })).toBeNull();
    expect(leerPerfil('{no es json')).toBeNull();
  });
});

describe('la alerta nunca se cae por el perfil', () => {
  it('un perfil inválido se ignora y la alerta pasa', () => {
    const m = validarMensaje({ dispositivo: 'x', tipo: 'alerta', evento, ruta: [], nombre: 'Ana', contactos: [], bloqueo: { operador: 99 } });
    expect(m.tipo === 'alerta' && m.bloqueo).toBeNull();
  });

  it('notificar_familia trae el perfil', () => {
    const m = validarMensaje({ dispositivo: 'x', tipo: 'notificar_familia', evento, nombre: 'Ana', contactos: [], bloqueo: { entidades: ['yape'] } });
    expect(m.tipo === 'notificar_familia' && m.bloqueo?.entidades).toEqual(['yape']);
  });
});

describe('armarKit', () => {
  it('arma los 4 pasos en el orden de OSIPTEL con los números fijos', () => {
    const kit = armarKit(validarPerfil({ entidades: ['yape', 'bcp', 'interbank'], operador: 'entel' }), 'Ana');
    expect(kit.map((k) => k.paso)).toEqual(['bancos', 'operador', 'denuncia', 'verificar_imei']);
    expect(kit[0]).toMatchObject({ titulo: 'Bloquear Yape, BCP y Interbank', telefono: '1820' });
    expect(kit[1]).toMatchObject({ titulo: 'Suspender la línea y el celular (Entel)', telefono: '(01) 611 7777' });
    expect(kit[2].enlace).toMatch(/^https:\/\/sistemas\.policia\.gob\.pe\//);
    expect(kit[3].enlace).toBe('https://checatuimei.osiptel.gob.pe');
  });

  it('sin perfil igual sirve: lista los números de todas las operadoras', () => {
    const kit = armarKit(null, 'Ana');
    expect(kit[0].titulo).toBe('Bloquear bancos, Yape y Plin');
    expect(kit[1].telefono).toBeNull();
    expect(kit[1].detalle).toContain('0800 11800');
  });
});

describe('validarMarca', () => {
  it('solo acepta pasos del kit', () => {
    expect(validarMarca({ paso: 'bancos', contacto: 1 })).toEqual({ paso: 'bancos', contacto: 1, hecho: true });
    expect(validarMarca({ paso: 'operador', hecho: false })).toEqual({ paso: 'operador', contacto: -1, hecho: false });
    expect(validarMarca({ paso: 'transferir_plata' })).toBeNull();
    expect(validarMarca({ paso: 'bancos', hecho: 'false' })?.hecho).toBe(false);
    expect(validarMarca({ paso: 'bancos', hecho: 0 })?.hecho).toBe(false);
    expect(validarMarca(null)).toBeNull();
  });
});
