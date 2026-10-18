import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { urlBackend } from '../alertas';
import type { Kit } from '../componentes/KitBloqueo';
import { T, hora, type Paso } from '../ui/componentes';
import { COLORES } from '../ui/tema';
import { EJEMPLO_CONTACTO, WebContacto, type Coordenada, type DatosContacto } from './WebContacto';

/**
 * F5 en vivo: la página que abre el contacto desde el WhatsApp (`/a/<id>?c=<n>`). Lee la alerta del
 * backend cada 2 s, así la ruta de huida se ve moverse. `/a/ejemplo` muestra la vista de ejemplo (la
 * prueba guiada manda ese enlace).
 */

interface AlertaPublica {
  nombre: string;
  estado: 'en_espera' | 'avisada' | 'robo_confirmado' | 'cancelada';
  velocidadMs: number | null;
  tJalon: number | null;
  jalon: Coordenada | null;
  ruta: Array<Coordenada & { t: number; velocidad: number | null }>;
  encargado: string | null;
  roboConfirmadoPor: string | null;
  roboConfirmado: number | null;
  kit: Kit | null;
  cancelada: number | null;
  ahora: number;
}

const CADA_MS = 2000;
const PUNTOS = ['norte', 'noreste', 'este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste'];

/** Hacia dónde va: rumbo entre la última lectura y la de ~15 s antes. */
export function rumbo(ruta: Array<Coordenada & { t: number }>): string | null {
  const fin = ruta[ruta.length - 1];
  const antes = [...ruta].reverse().find((p) => fin.t - p.t >= 15_000) ?? ruta[0];
  if (!fin || !antes || antes === fin) return null;
  const k = Math.cos((fin.lat * Math.PI) / 180);
  const dx = (fin.lon - antes.lon) * k;
  const dy = fin.lat - antes.lat;
  if (Math.hypot(dx, dy) < 0.0003) return null; // menos de ~30 m: no se está moviendo
  const grados = ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360;
  return PUNTOS[Math.round(grados / 45) % 8];
}

function hace(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  return `hace ${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function aDatos(a: AlertaPublica): DatosContacto {
  const ultima = a.ruta[a.ruta.length - 1];
  const kmh = ultima?.velocidad != null && ultima.velocidad >= 0 ? Math.round(ultima.velocidad * 3.6) : a.velocidadMs !== null ? Math.round(a.velocidadMs * 3.6) : null;
  const hacia = rumbo(a.ruta);
  const pasos: Paso[] = [];
  if (a.estado === 'cancelada' && a.cancelada) pasos.push({ hora: hora(a.cancelada, true), texto: `${a.nombre} confirmó que está bien`, clave: true, ahora: true });
  else if (ultima) pasos.push({ hora: hora(ultima.t, true), texto: hacia ? `Va hacia el ${hacia}${kmh !== null ? ` · ${kmh} km/h` : ''}` : 'Última ubicación', clave: true, ahora: true });
  if (a.roboConfirmado) pasos.push({ hora: hora(a.roboConfirmado, true), texto: `${a.roboConfirmadoPor ?? 'Alguien de su red'} confirmó el robo`, clave: true });
  if (a.encargado) pasos.push({ hora: '', texto: `${a.encargado} se está encargando` });
  if (a.tJalon) pasos.push({ hora: hora(a.tJalon, true), texto: 'Jalón: le arrancharon el celular', clave: true });
  return {
    nombre: a.nombre,
    pasos,
    velocidadKmh: kmh,
    horaJalon: a.tJalon ? hora(a.tJalon) : '—',
    haceTexto: a.tJalon ? hace(a.ahora - a.tJalon) : '',
    ruta: a.ruta,
    jalon: a.jalon,
    estado: a.estado,
    encargado: a.encargado,
    roboConfirmadoPor: a.roboConfirmadoPor,
    kit: a.kit,
  };
}

export function ContactoEnVivo({ id, contacto }: { id: string; contacto: number | null }) {
  const [alerta, setAlerta] = useState<AlertaPublica | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id === 'ejemplo') return;
    let vivo = true;
    const leer = async () => {
      try {
        const r = await fetch(`${urlBackend()}/api/alertas/${id}`, { cache: 'no-store' });
        const datos = (await r.json()) as AlertaPublica & { detalle?: string };
        if (!vivo) return;
        if (!r.ok) return setError(r.status === 404 ? 'Este enlace no corresponde a ninguna alerta.' : (datos.detalle ?? 'No pudimos cargar la alerta.'));
        setError(null);
        setAlerta(datos);
      } catch {
        // Sin señal un momento: mantenemos lo último que vimos y reintentamos.
        if (vivo) setError((e) => e ?? 'Sin conexión, reintentando…');
      }
    };
    void leer();
    const reloj = setInterval(leer, CADA_MS);
    return () => {
      vivo = false;
      clearInterval(reloj);
    };
  }, [id]);

  if (id === 'ejemplo') return <WebContacto datos={EJEMPLO_CONTACTO} ejemplo />;
  if (!alerta) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORES.dia.fondo, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
        {error ? <T color={COLORES.dia.texto}>{error}</T> : <ActivityIndicator color={COLORES.dia.alerta} />}
      </View>
    );
  }
  return (
    <WebContacto
      datos={aDatos(alerta)}
      ejemplo={false}
      onConfirmarRobo={async () => {
        try {
          const r = await fetch(`${urlBackend()}/api/alertas/${id}/robo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contacto }),
          });
          const d = (await r.json().catch(() => ({}))) as { detalle?: string };
          if (!r.ok) return d.detalle ? `No se pudo confirmar: ${d.detalle}.` : 'No se pudo confirmar. Inténtalo otra vez.';
          // Leemos la alerta otra vez para mostrar el kit sin esperar la siguiente vuelta.
          const v = await fetch(`${urlBackend()}/api/alertas/${id}`, { cache: 'no-store' });
          if (v.ok) setAlerta((await v.json()) as AlertaPublica);
          return null;
        } catch {
          return 'Sin conexión. Revisa tu internet e inténtalo otra vez.';
        }
      }}
      onMarcarPaso={async (paso, hecho) => {
        try {
          const r = await fetch(`${urlBackend()}/api/alertas/${id}/bloqueo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paso, hecho, contacto }),
          });
          return r.ok;
        } catch {
          return false;
        }
      }}
      onEncargarme={async () => {
        try {
          const r = await fetch(`${urlBackend()}/api/alertas/${id}/encargado`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contacto }),
          });
          return r.ok;
        } catch {
          return false;
        }
      }}
    />
  );
}
