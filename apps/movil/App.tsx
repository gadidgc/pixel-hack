import { Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold } from '@expo-google-fonts/figtree';
import { IBMPlexMono_400Regular, IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono';
import { Lexend_300Light, Lexend_500Medium, Lexend_600SemiBold, useFonts } from '@expo-google-fonts/lexend';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { guardarPreferencias } from './src/preferencias';
import { Bienvenida } from './src/pantallas/Bienvenida';
import { Cerca } from './src/pantallas/Cerca';
import { Contacto } from './src/pantallas/Contacto';
import { ContactoEnVivo } from './src/pantallas/ContactoEnVivo';
import { FalsaAlarma } from './src/pantallas/FalsaAlarma';
import { Grabar } from './src/pantallas/Grabar';
import { Herramientas } from './src/pantallas/Herramientas';
import { Inicio } from './src/pantallas/Inicio';
import { MeRobaron } from './src/pantallas/MeRobaron';
import { Permisos } from './src/pantallas/Permisos';
import { Prueba } from './src/pantallas/Prueba';
import { TodoBien } from './src/pantallas/TodoBien';
import { Tu } from './src/pantallas/Tu';
import { EJEMPLO_CONTACTO, WebContacto, type DatosContacto } from './src/pantallas/WebContacto';
import { servicio, type EstadoProteccion } from './src/servicio';
import { useProteccion, usePreferencias } from './src/useProteccion';
import { hora, type Pestana } from './src/ui/componentes';
import { COLORES, TemaContexto } from './src/ui/tema';

type PasoBienvenida = 'bienvenida' | 'permisos' | 'contacto' | 'prueba';
type Extra = null | 'red' | 'herramientas' | 'meRobaron' | 'vistaContacto' | 'alerta';

/**
 * En la web (la URL pública) también servimos las páginas que se abren desde OTRO celular:
 * - `/a/<id>?c=<n>`: lo que ve el contacto (F5), en vivo desde el backend. `/a/ejemplo` o `?ver=contacto`: vista de ejemplo.
 * - `/yo` o `?ver=yo`: "Me robaron" (F6).
 */
type PaginaWeb = { tipo: 'contacto'; id: string; contacto: number | null } | { tipo: 'yo' } | null;

function paginaWeb(): PaginaWeb {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const { pathname, search } = window.location;
  const enlace = pathname.match(/^\/a\/([a-z0-9]+)/);
  if (enlace) {
    const c = Number(new URLSearchParams(search).get('c'));
    return { tipo: 'contacto', id: enlace[1], contacto: Number.isInteger(c) && c >= 0 ? c : null };
  }
  if (search.includes('ver=contacto')) return { tipo: 'contacto', id: 'ejemplo', contacto: null };
  if (pathname.startsWith('/yo') || search.includes('ver=yo')) return { tipo: 'yo' };
  return null;
}

function datosDeLaAlerta(estado: EstadoProteccion, nombre: string): DatosContacto {
  const a = estado.alerta;
  if (!a) return EJEMPLO_CONTACTO;
  const v = a.evento.velocidadMs;
  // El contacto solo ve el robo (jalón y huida), no los pasos internos de la app.
  return {
    nombre: nombre || 'tu contacto',
    pasos: [
      { hora: hora(a.evento.t, true), texto: v === null ? 'Huida confirmada' : `Huida en vehículo confirmada · ${Math.round(v * 3.6)} km/h`, clave: true, ahora: true },
      { hora: hora(a.evento.tJalon, true), texto: 'Jalón: le arrancharon el celular', clave: true },
    ],
    velocidadKmh: v === null ? null : Math.round(v * 3.6),
    ruta: servicio.rutaReciente(),
    jalon: a.evento.posicionJalon,
    horaJalon: hora(a.evento.tJalon),
    haceTexto: `hace ${Math.max(0, Math.round((Date.now() - a.evento.tJalon) / 1000))} s`,
  };
}

export default function App() {
  const [fuentes] = useFonts({
    Lexend_300Light,
    Lexend_500Medium,
    Lexend_600SemiBold,
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
  });
  return (
    <SafeAreaProvider>
      <TemaContexto.Provider value={COLORES.noche}>
        <StatusBar style="light" />
        {fuentes ? (
          <Navegacion />
        ) : (
          <View style={{ flex: 1, backgroundColor: COLORES.noche.fondo, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={COLORES.noche.protegido} />
          </View>
        )}
      </TemaContexto.Provider>
    </SafeAreaProvider>
  );
}

function Navegacion() {
  const prefs = usePreferencias();
  const { estado } = useProteccion();
  const [paso, setPaso] = useState<PasoBienvenida>('bienvenida');
  const [pestana, setPestana] = useState<Pestana>('inicio');
  const [extra, setExtra] = useState<Extra>(null);
  const web = paginaWeb();
  const listas = Boolean(prefs?.bienvenidaHecha);
  useEffect(() => {
    if (listas && !web && Platform.OS !== 'web') void servicio.reanudarSiEstabaActiva();
    // Solo al abrir la app.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listas]);

  if (web?.tipo === 'contacto') return <ContactoEnVivo id={web.id} contacto={web.contacto} />;
  if (web?.tipo === 'yo') return <MeRobaron />;
  if (!prefs) return <View style={{ flex: 1, backgroundColor: COLORES.noche.fondo }} />;

  // F1 · Primer uso
  if (!prefs.bienvenidaHecha) {
    const terminar = async () => {
      await guardarPreferencias({ bienvenidaHecha: true });
      void servicio.activar();
    };
    if (paso === 'bienvenida') return <Bienvenida onSeguir={() => setPaso('permisos')} />;
    if (paso === 'permisos') return <Permisos onSeguir={() => setPaso('contacto')} onVolver={() => setPaso('bienvenida')} />;
    if (paso === 'contacto') return <Contacto onSeguir={() => setPaso('prueba')} onVolver={() => setPaso('permisos')} />;
    return <Prueba onListo={terminar} onVolver={() => setPaso('contacto')} />;
  }

  // Durante una alerta: cuando ya se avisó (o se está avisando) a la red, esa pantalla manda.
  const alerta = estado.alerta;
  const mostrarAlerta = alerta && (alerta.familia !== 'esperando' || extra === 'alerta');

  let contenido;
  if (extra === 'vistaContacto') {
    contenido = <WebContacto datos={datosDeLaAlerta(estado, prefs.nombre)} ejemplo={!alerta} onCerrar={() => setExtra(alerta ? 'alerta' : null)} />;
  } else if (mostrarAlerta) {
    contenido = <FalsaAlarma onVerAviso={() => setExtra('vistaContacto')} onCerrar={() => setExtra(null)} />;
  } else if (extra === 'red') {
    contenido = <Contacto paso={false} onSeguir={() => setExtra(null)} onVolver={() => setExtra(null)} />;
  } else if (extra === 'herramientas') {
    contenido = <Herramientas onVolver={() => setExtra(null)} />;
  } else if (extra === 'meRobaron') {
    contenido = <MeRobaron nombre={prefs.nombre} onCerrar={() => setExtra(null)} />;
  } else if (pestana === 'cerca') {
    contenido = <Cerca onPestana={setPestana} />;
  } else if (pestana === 'grabar') {
    contenido = <Grabar onPestana={setPestana} />;
  } else if (pestana === 'tu') {
    contenido = <Tu onPestana={setPestana} onRed={() => setExtra('red')} onHerramientas={() => setExtra('herramientas')} onMeRobaron={() => setExtra('meRobaron')} />;
  } else {
    contenido = <Inicio onPestana={setPestana} onCerca={() => setPestana('cerca')} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORES.noche.fondo }}>
      {contenido}
      {/* "¿Todo bien?" va encima de todo mientras se espera la respuesta (aunque estés en otra pestaña). */}
      {extra !== 'alerta' && <TodoBien onVer={() => setExtra('alerta')} />}
    </View>
  );
}
