import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { AppState, Platform, Pressable, View } from 'react-native';
import { revisarBackend, type SaludBackend } from '../alertas';
import { abrirAjustesDeFondo, pedirSinOptimizacionBateria, sinOptimizacionBateria } from '../bateria';
import { PedirPin } from '../componentes/PedirPin';
import { guardarPin, verificarPin } from '../pin';
import { guardarPreferencias } from '../preferencias';
import { useProteccion, usePreferencias } from '../useProteccion';
import { BarraPestanas, Fila, Grupo, Pantalla, Rotulo, T, type Pestana } from '../ui/componentes';
import { Icono } from '../ui/iconos';
import { RADIO, useTema } from '../ui/tema';

/**
 * Ajustes ("Tú"). Solo muestra lo que de verdad funciona: tu red, el tiempo de "¿Todo bien?", el PIN,
 * los permisos y la batería. "Activarse al salir" y "lugares conocidos" del diseño quedan para después.
 */
export function Tu({ onPestana, onRed, onHerramientas, onMeRobaron }: { onPestana: (p: Pestana) => void; onRed: () => void; onHerramientas: () => void; onMeRobaron: () => void }) {
  const c = useTema();
  const prefs = usePreferencias();
  const { estado } = useProteccion();
  const [siempre, setSiempre] = useState<boolean | null>(null);
  const [cambiarPin, setCambiarPin] = useState<'actual' | 'nuevo' | null>(null);
  // undefined = revisando; null = no responde.
  const [salud, setSalud] = useState<SaludBackend | null | undefined>(undefined);
  useEffect(() => {
    void revisarBackend().then(setSalud);
  }, []);
  const [sinOptimizacion, setSinOptimizacion] = useState<boolean | null>(() => sinOptimizacionBateria());

  // Al volver de los ajustes del sistema, revisamos otra vez si ya quitó la optimización de batería.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (e) => {
      if (e === 'active') setSinOptimizacion(sinOptimizacionBateria());
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    void Location.getBackgroundPermissionsAsync().then((p) => setSiempre(p.granted));
  }, [estado.activa]);

  if (!prefs) return null;
  const opciones = [10, 15, 20];

  return (
    <View style={{ flex: 1, backgroundColor: c.fondo }}>
      <Pantalla style={{ gap: 14 }}>
        <T v="titulo26" accessibilityRole="header">
          Tú
        </T>

        <Rotulo>ALERTAS</Rotulo>
        <Grupo>
          <Fila titulo="Mi red" detalle={prefs.contactos.map((x) => x.nombre).join(', ') || 'Nadie todavía'} onPress={onRed} derecha={<Icono nombre="flecha" tam={18} color={c.textoSuave} />} />
          <View style={{ paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.linea, gap: 10 }}>
            <T v="cuerpo15">Tiempo para responder "¿Todo bien?"</T>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {opciones.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => void guardarPreferencias({ esperaFamiliaS: s })}
                  accessibilityRole="button"
                  accessibilityState={{ selected: prefs.esperaFamiliaS === s }}
                  style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: RADIO.total, justifyContent: 'center', backgroundColor: prefs.esperaFamiliaS === s ? c.texto : c.superficie2 }}
                >
                  <T v="dato" color={prefs.esperaFamiliaS === s ? c.fondo : c.texto}>
                    {`${s} s`}
                  </T>
                </Pressable>
              ))}
            </View>
          </View>
          <Fila titulo="Cambiar mi PIN" detalle="Para cancelar, pausar o apagar" onPress={() => setCambiarPin('actual')} ultima derecha={<Icono nombre="candado" tam={18} color={c.textoSuave} />} />
        </Grupo>

        <Rotulo>PERMISOS Y BATERÍA</Rotulo>
        <Grupo>
          <Fila
            titulo="Con la pantalla apagada"
            detalle={estado.segundoPlano === null ? 'Se sabe al activar la protección' : estado.segundoPlano ? 'Sigue protegiendo' : 'Solo con la app abierta'}
            derecha={<T v="apoyo13" color={estado.segundoPlano ? c.protegido : c.aviso}>{estado.segundoPlano === null ? '—' : estado.segundoPlano ? 'Sí' : 'No'}</T>}
          />
          {Platform.OS !== 'web' && (
            <Fila
              titulo='Ubicación "Permitir siempre"'
              derecha={<T v="apoyo13" color={siempre ? c.protegido : c.aviso}>{siempre === null ? '—' : siempre ? 'Permitida' : 'Falta'}</T>}
              fondo={siempre === false ? c.avisoFondo : undefined}
            />
          )}
          {Platform.OS === 'android' && (
            <Fila
              titulo="Funcionar con la pantalla apagada"
              detalle={sinOptimizacion ? 'Sin optimización de batería' : 'Quita la optimización de batería'}
              onPress={sinOptimizacion ? undefined : () => void pedirSinOptimizacionBateria().catch(() => undefined)}
              fondo={sinOptimizacion === false ? c.avisoFondo : undefined}
              derecha={
                sinOptimizacion ? (
                  <T v="apoyo13" color={c.protegido}>Listo</T>
                ) : (
                  <View style={{ minHeight: 36, paddingHorizontal: 12, borderRadius: 10, backgroundColor: c.aviso, justifyContent: 'center' }}><T v="apoyo13" color="#1f1300">Arreglar</T></View>
                )
              }
            />
          )}
          {Platform.OS === 'android' && (
            <Fila
              titulo="Inicio automático y batería"
              detalle="Xiaomi, Huawei, Samsung: permite que corra en segundo plano y sin restricciones"
              onPress={() => void abrirAjustesDeFondo().catch(() => undefined)}
              derecha={<Icono nombre="flecha" tam={18} color={c.textoSuave} />}
            />
          )}
          <Fila
            titulo="Panel de alertas"
            detalle={
              salud === undefined
                ? 'Revisando…'
                : !salud?.base
                  ? 'Sin conexión: las alertas no salen del celular'
                  : salud.mensajes
                    ? 'Conectado, con WhatsApp y SMS'
                    : 'Conectado, pero sin WhatsApp ni SMS todavía (falta Zavu)'
            }
            ultima
            derecha={
              <T v="apoyo13" color={salud?.base && salud.mensajes ? c.protegido : c.aviso}>
                {salud === undefined ? '…' : salud?.base ? (salud.mensajes ? 'OK' : 'A medias') : 'Falta'}
              </T>
            }
          />
        </Grupo>

        <Rotulo>SI TE ROBARON</Rotulo>
        <Grupo>
          <Fila titulo="Qué hacer en la primera hora" detalle="Suspender la línea, bloquear el IMEI, cambiar claves" onPress={onMeRobaron} ultima derecha={<Icono nombre="flecha" tam={18} color={c.textoSuave} />} />
        </Grupo>

        <Rotulo>EQUIPO</Rotulo>
        <Grupo>
          <Fila titulo="Herramientas del equipo" detalle="Modo demo, grabar datos de sensores, simular" onPress={onHerramientas} ultima derecha={<Icono nombre="herramienta" tam={18} color={c.textoSuave} />} />
        </Grupo>
      </Pantalla>
      <BarraPestanas actual="tu" onCambiar={onPestana} conFondo />

      <PedirPin
        visible={cambiarPin === 'actual'}
        titulo="Tu PIN actual"
        explicacion="Escríbelo para poder cambiarlo."
        alConfirmar={async (p) => {
          const ok = await verificarPin(p);
          if (ok) setTimeout(() => setCambiarPin('nuevo'), 300);
          return ok;
        }}
        alCerrar={() => setCambiarPin((x) => (x === 'actual' ? null : x))}
      />
      <PedirPin
        visible={cambiarPin === 'nuevo'}
        crear
        titulo="Nuevo PIN"
        explicacion="De 4 a 6 números."
        alConfirmar={async (p) => {
          await guardarPin(p);
          return true;
        }}
        alCerrar={() => setCambiarPin(null)}
      />
    </View>
  );
}
