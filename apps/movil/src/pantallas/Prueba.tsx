import { useState } from 'react';
import { Linking, View } from 'react-native';
import { PasoBienvenida, TOTAL_PASOS } from '../componentes/PasoBienvenida';
import { servicio, type ResultadoPrueba } from '../servicio';
import { usePreferencias } from '../useProteccion';
import { Boton, T } from '../ui/componentes';
import { Icono } from '../ui/iconos';
import { RADIO, useTema } from '../ui/tema';

/**
 * F1 · Último paso: prueba guiada. Corre un arrebato grabado por el MISMO detector y manda un mensaje de PRUEBA
 * a la red. Al terminar se enciende la protección y se ESPERA el resultado: si no se pudo (casi siempre
 * por la ubicación "Siempre"), lo decimos aquí con el camino para arreglarlo, en vez de dejar a la persona
 * en un Inicio que dice "Protección apagada" sin explicar por qué.
 */
/** El mensaje de prueba que manda el backend (apps/api/src/mensajes.ts, `prueba`), sin el enlace. */
function textoPrueba(nombre: string): string {
  return `${nombre || 'Alguien de tu familia'} te eligió como contacto de confianza. Si le arranchan el celular te llegará un mensaje así, con su ruta.`;
}

export interface MotivoSinProteccion {
  texto: string;
  /** Se arregla dando un permiso en Ajustes. */
  enAjustes: boolean;
}

export function Prueba({
  onListo,
  onEntrarSinProteccion,
  onVolver,
}: {
  /** Enciende la protección y devuelve `null`, o el motivo si no se pudo. */
  onListo: () => Promise<MotivoSinProteccion | null>;
  onEntrarSinProteccion: () => void;
  onVolver: () => void;
}) {
  const c = useTema();
  const prefs = usePreferencias();
  const [resultado, setResultado] = useState<ResultadoPrueba | null>(null);
  const [probando, setProbando] = useState(false);
  const [activando, setActivando] = useState(false);
  const [falla, setFalla] = useState<MotivoSinProteccion | null>(null);
  const contacto = prefs?.contactos[0]?.nombre ?? 'tu contacto';

  const probar = async () => {
    setProbando(true);
    setResultado(await servicio.probar());
    setProbando(false);
  };

  const terminar = async () => {
    setActivando(true);
    setFalla(await onListo());
    setActivando(false);
  };

  if (falla) {
    return (
      <PasoBienvenida
        paso={TOTAL_PASOS}
        onVolver={() => setFalla(null)}
        titulo="Falta encender la protección"
        texto={falla.texto}
        icono={
          <View style={{ width: 64, height: 64, borderRadius: RADIO.total, backgroundColor: c.avisoFondo, alignItems: 'center', justifyContent: 'center' }}>
            <Icono nombre="escudoAviso" tam={30} color={c.aviso} />
          </View>
        }
        abajo={
          <>
            {falla.enAjustes ? (
              <>
                <Boton texto="Abrir Ajustes" icono="ajustes" onPress={() => void Linking.openSettings()} />
                <Boton texto={activando ? 'Activando…' : 'Ya lo arreglé, activar'} variante="secundario" principal={false} onPress={terminar} deshabilitado={activando} />
                <Boton texto="Entrar sin protección" variante="terciario" onPress={onEntrarSinProteccion} />
              </>
            ) : (
              <>
                <Boton texto="Entrar a la app" icono="flecha" onPress={onEntrarSinProteccion} />
                <Boton texto={activando ? 'Activando…' : 'Intentar otra vez'} variante="terciario" onPress={terminar} deshabilitado={activando} />
              </>
            )}
          </>
        }
      />
    );
  }

  if (!resultado) {
    return (
      <PasoBienvenida
        paso={TOTAL_PASOS}
        onVolver={onVolver}
        titulo={`Probemos con ${contacto}`}
        texto="Simulamos un arrebato y le mandamos un mensaje marcado como PRUEBA."
        abajo={
          <>
            <Boton texto={probando ? 'Enviando…' : 'Enviar prueba'} icono="enviar" onPress={probar} deshabilitado={probando} />
            <Boton texto={activando ? 'Activando…' : 'Saltar'} variante="terciario" onPress={terminar} deshabilitado={activando} />
          </>
        }
      >
        <View style={{ flex: 1, minHeight: 220, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 200, height: 200, borderRadius: RADIO.total, backgroundColor: c.superficie, alignItems: 'center', justifyContent: 'center' }}>
            <Icono nombre="celularSacudido" tam={72} color={c.texto} grosor={1.6} />
          </View>
        </View>
      </PasoBienvenida>
    );
  }

  const detectado = resultado.huidaS !== null;
  const enviado = resultado.envio.enviado;
  const filas: Array<[string, string, boolean]> = [
    ['Jalón y huida detectados', detectado ? `${resultado.huidaS!.toFixed(1).replace('.', ',')} s` : 'no', detectado],
    [`Mensaje a ${contacto}`, enviado ? 'enviado' : 'no enviado', enviado],
  ];

  return (
    <PasoBienvenida
      paso={TOTAL_PASOS}
      onVolver={onVolver}
      titulo={detectado && enviado ? '¡Funciona!' : detectado ? 'Detectado, pero sin mensaje' : 'No se detectó'}
      texto={
        detectado && enviado
          ? `Detectamos el arrebato y ${contacto} recibió la prueba.`
          : !enviado
            ? `El mensaje a ${contacto} no salió: ${resultado.envio.detalle}.`
            : 'Prueba otra vez.'
      }
      icono={
        <View style={{ width: 72, height: 72, borderRadius: RADIO.total, backgroundColor: detectado && enviado ? c.protegidoFondo : c.avisoFondo, alignItems: 'center', justifyContent: 'center' }}>
          <Icono nombre={detectado && enviado ? 'check' : 'escudoAviso'} tam={36} color={detectado && enviado ? c.protegido : c.aviso} grosor={2.2} />
        </View>
      }
      abajo={
        <>
          <Boton texto={activando ? 'Activando…' : 'Listo, protégeme'} icono="escudoCheck" onPress={terminar} deshabilitado={activando} />
          <Boton texto="Probar otra vez" variante="terciario" onPress={probar} deshabilitado={probando} />
        </>
      }
    >
      <View style={{ borderTopWidth: 1, borderTopColor: c.linea }}>
        {filas.map(([nombre, valor, ok]) => (
          <View key={nombre} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.linea }}>
            <T>{nombre}</T>
            <T v="dato" color={ok ? c.protegido : c.aviso}>
              {valor}
            </T>
          </View>
        ))}
      </View>
      {enviado && (
        <View style={{ alignSelf: 'flex-start', maxWidth: 300, padding: 14, backgroundColor: c.superficie2, borderTopLeftRadius: 18, borderTopRightRadius: 18, borderBottomRightRadius: 18, borderBottomLeftRadius: 4, gap: 2 }}>
          <T v="etiqueta" color={c.aviso}>
            PRUEBA
          </T>
          <T v="cuerpo15">{textoPrueba(prefs?.nombre ?? '')}</T>
        </View>
      )}
    </PasoBienvenida>
  );
}
