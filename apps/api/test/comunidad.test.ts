import { describe, expect, it } from 'vitest';
import { MAX_EVIDENCIA_BYTES, MAX_MINIATURA_BYTES, cajaDe, redondear, validarBusqueda, validarEvidencia, validarMiniatura, validarReporte } from '../src/comunidad';
import { ErrorDeDatos } from '../src/validar';

describe('validarReporte', () => {
  it('acepta un reporte y redondea la ubicación a ~100 m', () => {
    const r = validarReporte({ dispositivo: 'ios-ab12cd34', tipo: 'arrebato_moto', lat: -12.121987, lon: -77.030456, nota: '  Moto roja,\ndos personas ' });
    expect(r).toEqual({ dispositivo: 'ios-ab12cd34', tipo: 'arrebato_moto', lat: -12.122, lon: -77.03, nota: 'Moto roja, dos personas' });
  });

  it('la nota es opcional y una nota vacía se guarda como null', () => {
    expect(validarReporte({ dispositivo: 'x', tipo: 'zona_oscura', lat: 0, lon: 0 }).nota).toBeNull();
    expect(validarReporte({ dispositivo: 'x', tipo: 'zona_oscura', lat: 0, lon: 0, nota: '   ' }).nota).toBeNull();
  });

  it('rechaza tipos desconocidos, notas largas, coordenadas imposibles y dispositivos raros', () => {
    const base = { dispositivo: 'x', tipo: 'intento', lat: -12, lon: -77 };
    expect(() => validarReporte({ ...base, tipo: 'ovni' })).toThrow(ErrorDeDatos);
    expect(() => validarReporte({ ...base, nota: 'a'.repeat(141) })).toThrow(ErrorDeDatos);
    expect(() => validarReporte({ ...base, nota: 42 })).toThrow(ErrorDeDatos);
    expect(() => validarReporte({ ...base, lat: 91 })).toThrow(ErrorDeDatos);
    expect(() => validarReporte({ ...base, lon: Number.NaN })).toThrow(ErrorDeDatos);
    expect(() => validarReporte({ ...base, dispositivo: "x' OR 1=1" })).toThrow(ErrorDeDatos);
    expect(() => validarReporte([base])).toThrow(ErrorDeDatos);
  });
});

describe('validarBusqueda y cajaDe', () => {
  it('usa 1 km por defecto y limita el radio', () => {
    expect(validarBusqueda(new URLSearchParams('lat=-12.12&lon=-77.03'))).toEqual({ lat: -12.12, lon: -77.03, radioKm: 1 });
    expect(validarBusqueda(new URLSearchParams('lat=-12.12&lon=-77.03&radioKm=2.5')).radioKm).toBe(2.5);
    expect(() => validarBusqueda(new URLSearchParams('lat=-12.12&lon=-77.03&radioKm=50'))).toThrow(ErrorDeDatos);
    expect(() => validarBusqueda(new URLSearchParams('lat=-12.12'))).toThrow(ErrorDeDatos);
    expect(() => validarBusqueda(new URLSearchParams('lat=abc&lon=-77'))).toThrow(ErrorDeDatos);
  });

  it('la caja de 1 km en Lima mide ~2 km por lado', () => {
    const caja = cajaDe({ lat: -12.12, lon: -77.03, radioKm: 1 });
    expect((caja.latMax - caja.latMin) * 110.574).toBeCloseTo(2, 5);
    const kmLon = (caja.lonMax - caja.lonMin) * 111.32 * Math.cos((-12.12 * Math.PI) / 180);
    expect(kmLon).toBeCloseTo(2, 5);
  });

  it('redondear deja 3 decimales', () => {
    expect(redondear(-12.12349)).toBe(-12.123);
    expect(redondear(-77.0304)).toBe(-77.03);
  });
});

describe('validarEvidencia', () => {
  const cabeceras = (extra: Record<string, string>) => new Headers({ 'X-Dispositivo': 'android-k3j9x2ab', 'Content-Type': 'video/mp4', 'Content-Length': '1024', ...extra });

  it('acepta video y audio, con o sin posición', () => {
    expect(validarEvidencia(cabeceras({}))).toEqual({ dispositivo: 'android-k3j9x2ab', tipo: 'video', mime: 'video/mp4', bytes: 1024, lat: null, lon: null, onda: null, duracionMs: null });
    const audio = validarEvidencia(cabeceras({ 'Content-Type': 'audio/mp4; codecs=mp4a', 'X-Lat': '-12.12111', 'X-Lon': '-77.03' }));
    expect(audio).toMatchObject({ tipo: 'audio', mime: 'audio/mp4', lat: -12.121, lon: -77.03 });
  });

  it('rechaza otros tipos, archivos sin largo o muy grandes y dispositivos faltantes', () => {
    expect(() => validarEvidencia(cabeceras({ 'Content-Type': 'text/html' }))).toThrow(ErrorDeDatos);
    expect(() => validarEvidencia(cabeceras({ 'Content-Type': 'image/svg+xml' }))).toThrow(ErrorDeDatos);
    expect(() => validarEvidencia(cabeceras({ 'Content-Length': '0' }))).toThrow(ErrorDeDatos);
    expect(() => validarEvidencia(cabeceras({ 'Content-Length': String(MAX_EVIDENCIA_BYTES + 1) }))).toThrow(ErrorDeDatos);
    expect(() => validarEvidencia(cabeceras({ 'X-Dispositivo': '' }))).toThrow(ErrorDeDatos);
    expect(() => validarEvidencia(cabeceras({ 'X-Lat': '200', 'X-Lon': '0' }))).toThrow(ErrorDeDatos);
  });

  it('guarda la onda (solo en audio) y la duración; si vienen mal, las ignora sin rechazar el archivo', () => {
    const audio = (extra: Record<string, string>) => validarEvidencia(cabeceras({ 'Content-Type': 'audio/mp4', ...extra }));
    expect(audio({ 'X-Onda': '0123456789', 'X-Duracion-Ms': '42000' })).toMatchObject({ onda: '0123456789', duracionMs: 42000 });
    expect(audio({ 'X-Onda': '12a4', 'X-Duracion-Ms': '-5' })).toMatchObject({ onda: null, duracionMs: null });
    expect(audio({ 'X-Onda': '1'.repeat(97) })).toMatchObject({ onda: null });
    expect(validarEvidencia(cabeceras({ 'X-Onda': '0123456789', 'X-Duracion-Ms': '14000' }))).toMatchObject({ onda: null, duracionMs: 14000 });
  });
});

describe('validarMiniatura', () => {
  const cabeceras = (extra: Record<string, string>) => new Headers({ 'X-Dispositivo': 'android-k3j9x2ab', 'Content-Type': 'image/jpeg', 'Content-Length': '2048', ...extra });

  it('acepta un JPEG chico', () => {
    expect(validarMiniatura(cabeceras({}))).toEqual({ dispositivo: 'android-k3j9x2ab', bytes: 2048 });
  });

  it('rechaza otros formatos (SVG puede llevar código), sin largo, muy grandes o sin dispositivo', () => {
    expect(() => validarMiniatura(cabeceras({ 'Content-Type': 'image/svg+xml' }))).toThrow(ErrorDeDatos);
    expect(() => validarMiniatura(cabeceras({ 'Content-Type': 'text/html' }))).toThrow(ErrorDeDatos);
    expect(() => validarMiniatura(cabeceras({ 'Content-Length': '0' }))).toThrow(ErrorDeDatos);
    expect(() => validarMiniatura(cabeceras({ 'Content-Length': String(MAX_MINIATURA_BYTES + 1) }))).toThrow(ErrorDeDatos);
    expect(() => validarMiniatura(cabeceras({ 'X-Dispositivo': '' }))).toThrow(ErrorDeDatos);
  });

  it('un reporte de la comunidad no puede elegir el tipo "grabacion" (solo lo crea el servidor)', () => {
    expect(() => validarReporte({ dispositivo: 'x', tipo: 'grabacion', lat: 0, lon: 0 })).toThrow(ErrorDeDatos);
  });
});
