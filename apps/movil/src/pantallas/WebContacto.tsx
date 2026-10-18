import { useState } from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Boton, Hoja, Insignia, LineaDeTiempo, Onda, T, type Paso } from '../ui/componentes';
import { Icono } from '../ui/iconos';
import { MapaFondo, useEscalaX } from '../ui/mapa';
import { COLORES, RADIO, TemaContexto, useTema } from '../ui/tema';

export interface DatosContacto {
  nombre: string;
  pasos: Paso[];
  velocidadKmh: number | null;
  horaJalon: string;
  haceTexto: string;
}

/** Datos de ejemplo, SOLO para mostrar cómo se verá (se marca en pantalla). */
export const EJEMPLO_CONTACTO: DatosContacto = {
  nombre: 'Ana',
  pasos: [
    { hora: '19:43:11', texto: 'Va al norte por Av. Arequipa', clave: true, ahora: true },
    { hora: '19:42:05', texto: 'Jalón en Av. Arequipa y Calle Schell', clave: true },
  ],
  velocidadKmh: 34,
  horaJalon: '19:42',
  haceTexto: 'hace 01:12',
};

/**
 * F5 · Página web del contacto (tema Día). La abre la mamá desde el WhatsApp, sin instalar nada.
 * Primero lo que calma ("probablemente está bien"), después el dato. Un solo botón de emergencia.
 */
export function WebContacto({ datos, ejemplo, onCerrar }: { datos: DatosContacto; ejemplo: boolean; onCerrar?: () => void }) {
  return (
    <TemaContexto.Provider value={COLORES.dia}>
      <Contenido datos={datos} ejemplo={ejemplo} onCerrar={onCerrar} />
    </TemaContexto.Provider>
  );
}

function Contenido({ datos, ejemplo, onCerrar }: { datos: DatosContacto; ejemplo: boolean; onCerrar?: () => void }) {
  const c = useTema();
  const ins = useSafeAreaInsets();
  const ex = useEscalaX();
  const [encargado, setEncargado] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: c.fondo }}>
      <MapaFondo alto={600}>
        <Svg width={ex(390)} height={600} viewBox="0 0 390 600" style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
          <Path d="M150 450 L162 394 L236 378 L312 362 L318 300 L322 242" fill="none" stroke={c.alerta} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 8" />
        </Svg>
        <View style={{ position: 'absolute', left: ex(140), top: 440, width: 20, height: 20, borderRadius: 99, backgroundColor: '#ffffff', borderWidth: 4, borderColor: c.alerta }} />
        <View style={{ position: 'absolute', left: ex(166), top: 458, backgroundColor: c.superficie, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 }}>
          <T v="apoyo13">Jalón · {datos.horaJalon}</T>
        </View>
        <View style={{ position: 'absolute', left: ex(303), top: 223, width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }}>
          <Onda tam={38} color="rgba(194,65,45,0.35)" duracionMs={2000} />
          <View style={{ width: 16, height: 16, borderRadius: 99, backgroundColor: c.alerta, borderWidth: 3, borderColor: '#ffffff' }} />
        </View>
        {datos.velocidadKmh !== null && (
          <View style={{ position: 'absolute', left: ex(190), top: 196, backgroundColor: c.alerta, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
            <T v="apoyo13" color={c.sobreAlerta}>
              Ahora · {datos.velocidadKmh} km/h
            </T>
          </View>
        )}
      </MapaFondo>

      <View style={{ paddingTop: ins.top + 12, paddingHorizontal: 16, paddingBottom: 14, backgroundColor: c.superficie, borderBottomWidth: 1, borderBottomColor: c.linea, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Insignia tipo="alerta" texto="EN VIVO" punto parpadeo />
          <T v="hora" suave>
            {datos.haceTexto}
          </T>
          <View style={{ flex: 1 }} />
          {onCerrar && (
            <Pressable onPress={onCerrar} accessibilityRole="button" accessibilityLabel="Cerrar" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Icono nombre="cerrar" color={c.texto} />
            </Pressable>
          )}
        </View>
        <T v="titulo" accessibilityRole="header">
          Le arrancharon el celular a {datos.nombre}
        </T>
        <T v="cuerpo15" suave>
          {datos.nombre} probablemente está bien. Esta es la ruta de su celular.
        </T>
        {ejemplo && <Insignia tipo="aviso" texto="VISTA DE EJEMPLO" />}
      </View>

      <View style={{ flex: 1 }} />
      <Hoja style={{ paddingTop: 18, paddingHorizontal: 16, paddingBottom: ins.bottom + 24 }}>
        <ScrollView contentContainerStyle={{ gap: 12 }}>
          <LineaDeTiempo pasos={datos.pasos} enTarjeta={false} />
          <Boton texto="Llamar a la Policía (105)" variante="emergencia" icono="telefono" onPress={() => void Linking.openURL('tel:105')} />
          {!encargado ? (
            <Boton texto="Yo me encargo (avisa al resto)" variante="secundario" principal={false} onPress={() => setEncargado(true)} />
          ) : (
            <View style={{ minHeight: 48, borderRadius: RADIO.total, backgroundColor: c.protegidoFondo, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 12 }}>
              <Icono nombre="check" tam={18} color={c.protegido} />
              <T v="cuerpo15Fuerte" color={c.protegido}>
                {ejemplo ? 'Así le avisaremos al resto de la red' : 'Avisamos al resto de la red que tú te encargas'}
              </T>
            </View>
          )}
        </ScrollView>
      </Hoja>
    </View>
  );
}
