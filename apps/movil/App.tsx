import { Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold } from '@expo-google-fonts/figtree';
import { IBMPlexMono_400Regular, IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono';
import { Lexend_300Light, Lexend_500Medium, Lexend_600SemiBold, useFonts } from '@expo-google-fonts/lexend';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { usePantallaBloqueada } from './src/bloqueo';
import { guardarPreferencias } from './src/preferencias';
import { AlertaSobreBloqueo } from './src/pantallas/AlertaSobreBloqueo';
import { Bienvenida } from './src/pantallas/Bienvenida';
import { BloqueoCuentas } from './src/pantallas/BloqueoCuentas';
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
type Extra = null | 'red' | 'cuentas' | 'herramientas' | 'meRobaron' | 'vistaContacto' | 'alerta';

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
    // Sin `?c=` no hay contacto (ojo: Number(null) es 0, que sería el primer contacto de la red).
    const crudo = new URLSearchParams(search).get('c');
    const c = crudo === null || crudo === '' ? NaN : Number(crudo);
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
  const [fuentes, errorFuentes] = useFonts({
    Lexend_300Light,
    Lexend_500Medium,
    Lexend_600SemiBold,
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
  });
  // Si una fuente falla o tarda (red lenta, Safari de iPhone), abrimos igual con la letra del sistema:
  // la página del contacto no puede quedarse en un círculo de carga.
  const [sinEsperar, setSinEsperar] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSinEsperar(true), 3000);
    return () => clearTimeout(t);
  }, []);
  const listo = fuentes || Boolean(errorFuentes) || sinEsperar;
  return (
    <SafeAreaProvider>
      <TemaContexto.Provider value={COLORES.noche}>
        <StatusBar style="light" />
        {listo ? (
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
  // Grabar se monta la primera vez que la abres y ya no se desmonta (ver Grabar.tsx).
  const [grabarMontado, setGrabarMontado] = useState(false);
  useEffect(() => {
    if (pestana === 'grabar') setGrabarMontado(true);
  }, [pestana]);
  const listas = Boolean(prefs?.bienvenidaHecha);
  // Con la app encima de la pantalla de bloqueo, solo se ve el "¿Todo bien?": nada de pestañas ni ajustes.
  const bloqueada = usePantallaBloqueada(Boolean(estado.alerta?.sobreBloqueo));
  useEffect(() => {
    if (listas && !web && Platform.OS !== 'web') void servicio.reanudarSiEstabaActiva();
    // Solo al abrir la app.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listas]);

  if (web?.tipo === 'contacto') return <ContactoEnVivo key={web.id} id={web.id} contacto={web.contacto} />;
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

  if (estado.alerta?.sobreBloqueo && bloqueada) return <AlertaSobreBloqueo />;

  // Durante una alerta: cuando ya se avisó (o se está avisando) a la red, esa pantalla manda.
  const alerta = estado.alerta;
  const mostrarAlerta = alerta && (alerta.familia !== 'esperando' || extra === 'alerta');

  let contenido = null;
  let enGrabar = false;
  if (extra === 'vistaContacto') {
    contenido = <WebContacto datos={datosDeLaAlerta(estado, prefs.nombre)} ejemplo={!alerta} onCerrar={() => setExtra(alerta ? 'alerta' : null)} />;
  } else if (mostrarAlerta) {
    contenido = <FalsaAlarma onVerAviso={() => setExtra('vistaContacto')} onCerrar={() => setExtra(null)} />;
  } else if (extra === 'red') {
    contenido = <Contacto paso={false} onSeguir={() => setExtra(null)} onVolver={() => setExtra(null)} />;
  } else if (extra === 'cuentas') {
    contenido = <BloqueoCuentas onVolver={() => setExtra(null)} />;
  } else if (extra === 'herramientas') {
    contenido = <Herramientas onVolver={() => setExtra(null)} />;
  } else if (extra === 'meRobaron') {
    contenido = <MeRobaron nombre={prefs.nombre} onCerrar={() => setExtra(null)} />;
  } else if (pestana === 'cerca') {
    contenido = <Cerca onPestana={setPestana} />;
  } else if (pestana === 'grabar') {
    enGrabar = true;
  } else if (pestana === 'tu') {
    contenido = <Tu onPestana={setPestana} onRed={() => setExtra('red')} onCuentas={() => setExtra('cuentas')} onHerramientas={() => setExtra('herramientas')} onMeRobaron={() => setExtra('meRobaron')} />;
  } else {
    contenido = <Inicio onPestana={setPestana} onCerca={() => setPestana('cerca')} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORES.noche.fondo }}>
      {contenido}
      {(grabarMontado || enGrabar) && (
        <View style={{ flex: 1, display: enGrabar ? 'flex' : 'none' }}>
          <Grabar visible={enGrabar} enPestana={pestana === 'grabar'} onPestana={setPestana} />
        </View>
      )}
      {/* "¿Todo bien?" va encima de todo mientras se espera la respuesta (aunque estés en otra pestaña). */}
      {extra !== 'alerta' && <TodoBien onVer={() => setExtra('alerta')} />}
    </View>
  );
}
