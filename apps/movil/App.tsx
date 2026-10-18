import { Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold } from '@expo-google-fonts/figtree';
import { IBMPlexMono_400Regular, IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono';
import { Lexend_300Light, Lexend_500Medium, Lexend_600SemiBold, useFonts } from '@expo-google-fonts/lexend';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { usePantallaBloqueada } from './src/bloqueo';
import { guardarPreferencias } from './src/preferencias';
import { CON_ATAJOS } from './src/componentes/PasoBienvenida';
import { AlertaSobreBloqueo } from './src/pantallas/AlertaSobreBloqueo';
import { AtajosBienvenida } from './src/pantallas/AtajosBienvenida';
import { Bienvenida } from './src/pantallas/Bienvenida';
import { BloqueoCuentas } from './src/pantallas/BloqueoCuentas';
import { Cerca } from './src/pantallas/Cerca';
import { Contacto } from './src/pantallas/Contacto';
import { ContactoBienvenida } from './src/pantallas/ContactoBienvenida';
import { ContactoEnVivo } from './src/pantallas/ContactoEnVivo';
import { FalsaAlarma } from './src/pantallas/FalsaAlarma';
import { Grabar } from './src/pantallas/Grabar';
import { Herramientas } from './src/pantallas/Herramientas';
import { Inicio } from './src/pantallas/Inicio';
import { MeRobaron } from './src/pantallas/MeRobaron';
import { Nombre } from './src/pantallas/Nombre';
import { Permisos } from './src/pantallas/Permisos';
import { PinBienvenida } from './src/pantallas/PinBienvenida';
import { Prueba, type MotivoSinProteccion } from './src/pantallas/Prueba';
import { Siempre } from './src/pantallas/Siempre';
import { TodoBien } from './src/pantallas/TodoBien';
import { Tu } from './src/pantallas/Tu';
import { EJEMPLO_CONTACTO, WebContacto, type DatosContacto } from './src/pantallas/WebContacto';
import { servicio, type EstadoProteccion } from './src/servicio';
import { useProteccion, usePreferencias } from './src/useProteccion';
import { hora, type Pestana } from './src/ui/componentes';
import { COLORES, TemaContexto } from './src/ui/tema';

type PasoBienvenida = 'bienvenida' | 'nombre' | 'contacto' | 'permisos' | 'siempre' | 'pin' | 'atajos' | 'prueba';
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

/**
 * Por qué no encendió la protección al terminar la bienvenida, en palabras de la persona.
 * `enAjustes`: se arregla dando un permiso en Ajustes (si no, por ejemplo un celular sin acelerómetro).
 */
function motivoSinProteccion(estado: EstadoProteccion): MotivoSinProteccion {
  // En el navegador no hay "Ajustes" que abrir: el permiso se da en el candado de la barra de direcciones.
  if (Platform.OS === 'web' && estado.permisosFaltantes.length) {
    return { texto: `Permite ${estado.permisosFaltantes.join(' y ')} en el candado de la barra de direcciones y recarga la página.`, enAjustes: false };
  }
  const faltan = estado.permisosFaltantes.filter((f) => f !== 'notificaciones');
  if (faltan.some((f) => f.startsWith('ubicación "'))) return { texto: 'En Ajustes › Ubicación elige «Siempre». Sin eso no funciona con la pantalla apagada.', enAjustes: true };
  if (faltan.length) return { texto: `En Ajustes da el permiso de ${faltan.join(' y ')} y vuelve.`, enAjustes: true };
  const ultimo = estado.registros.find((r) => r.tipo === 'error');
  return { texto: ultimo?.texto ?? 'No se pudo encender la protección.', enAjustes: false };
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
  // Si se borró todo desde Herramientas, la bienvenida empieza desde el primer paso.
  // Solo al pasar de "lista" a "no lista": durante la bienvenida las preferencias cambian y no hay que reiniciarla.
  const estabaLista = useRef(listas);
  useEffect(() => {
    if (estabaLista.current && !listas) {
      setPaso('bienvenida');
      setExtra(null);
      setPestana('inicio');
    }
    estabaLista.current = listas;
  }, [listas]);
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
    // Se espera a que la protección encienda: si no puede, Prueba muestra por qué y cómo arreglarlo,
    // en vez de dejar a la persona en un Inicio que dice "Protección apagada" sin explicar nada.
    const terminar = async (): Promise<MotivoSinProteccion | null> => {
      if (await servicio.activar()) {
        setPaso('bienvenida');
        await guardarPreferencias({ bienvenidaHecha: true });
        return null;
      }
      return motivoSinProteccion(servicio.obtener());
    };
    const entrarSinProteccion = () => {
      // Si luego se borra todo desde Herramientas, la bienvenida empieza en el paso 1 sin parpadear.
      setPaso('bienvenida');
      void guardarPreferencias({ bienvenidaHecha: true });
    };
    if (paso === 'bienvenida') return <Bienvenida onSeguir={() => setPaso('nombre')} />;
    if (paso === 'nombre') return <Nombre onSeguir={() => setPaso('contacto')} onVolver={() => setPaso('bienvenida')} />;
    if (paso === 'contacto') return <ContactoBienvenida onSeguir={() => setPaso('permisos')} onVolver={() => setPaso('nombre')} />;
    if (paso === 'permisos') return <Permisos onSeguir={() => setPaso('pin')} onFaltaSiempre={() => setPaso('siempre')} onVolver={() => setPaso('contacto')} />;
    if (paso === 'siempre') return <Siempre onSeguir={() => setPaso('pin')} onVolver={() => setPaso('permisos')} />;
    // iPhone: después del PIN, el bloqueo con Atajos (en Android y la web no hace falta).
    const despuesDelPin: PasoBienvenida = CON_ATAJOS ? 'atajos' : 'prueba';
    if (paso === 'pin') return <PinBienvenida onSeguir={() => setPaso(despuesDelPin)} onVolver={() => setPaso('permisos')} />;
    if (paso === 'atajos') return <AtajosBienvenida onSeguir={() => setPaso('prueba')} onVolver={() => setPaso('pin')} />;
    return <Prueba onListo={terminar} onEntrarSinProteccion={entrarSinProteccion} onVolver={() => setPaso(CON_ATAJOS ? 'atajos' : 'pin')} />;
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
