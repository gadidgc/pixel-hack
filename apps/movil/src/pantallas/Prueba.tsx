import { useState } from 'react';
import { View } from 'react-native';
import { PedirPin } from '../componentes/PedirPin';
import { guardarPin, hayPin } from '../pin';
import { servicio, type ResultadoPrueba } from '../servicio';
import { usePreferencias } from '../useProteccion';
import { Boton, Pantalla, Pasos, T, Tarjeta } from '../ui/componentes';
import { Icono } from '../ui/iconos';
import { RADIO, useTema } from '../ui/tema';

/**
 * F1 · 4/4 Prueba guiada: corre un arrebato grabado por el MISMO detector y manda un mensaje de PRUEBA
 * a la red. Al final se crea el PIN (en el diseño, "Cancelar con tu huella"; aquí PIN).
 */
export function Prueba({ onListo, onVolver }: { onListo: () => void; onVolver: () => void }) {
  const c = useTema();
  const prefs = usePreferencias();
  const [resultado, setResultado] = useState<ResultadoPrueba | null>(null);
  const [probando, setProbando] = useState(false);
  const [pedirPin, setPedirPin] = useState(false);
  const contacto = prefs?.contactos[0]?.nombre ?? 'tu contacto';

  const probar = async () => {
    setProbando(true);
    setResultado(await servicio.probar());
    setProbando(false);
  };

  const terminar = async () => {
    if (!(await hayPin())) return setPedirPin(true);
    onListo();
  };

  const s = (x: number | null) => (x === null ? 'no detectado' : `${x.toFixed(1).replace('.', ',')} s`);

  return (
    <Pantalla>
      <Pasos paso={4} total={4} onVolver={onVolver} />
      <View style={{ gap: 8 }}>
        <T v="titulo26" accessibilityRole="header">
          Probemos una vez
        </T>
        <T suave>Simulamos un arrebato. A {contacto} le llega un mensaje marcado como PRUEBA, para que sepa cómo se verá.</T>
      </View>

      {!resultado ? (
        <>
          <View style={{ flex: 1, minHeight: 240, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <View style={{ width: 200, height: 200, borderRadius: RADIO.total, borderWidth: 1, borderStyle: 'dashed', borderColor: c.linea, alignItems: 'center', justifyContent: 'center' }}>
              <Icono nombre="celularSacudido" tam={64} color={c.textoSuave} grosor={1.6} />
            </View>
            <T v="apoyo" suave style={{ textAlign: 'center', maxWidth: 280 }}>
              No hace falta mover el celular: usamos un arrebato grabado y lo pasamos por el mismo detector.
            </T>
          </View>
          <Boton texto={probando ? 'Simulando…' : 'Simular un arrebato'} icono="celularSacudido" onPress={probar} deshabilitado={probando} />
        </>
      ) : (
        <>
          <Tarjeta style={{ padding: 0, overflow: 'hidden' }}>
            {[
              ['Jalón detectado', s(resultado.jalonS), c.texto],
              ['Huida confirmada', s(resultado.huidaS), c.texto],
              [`Mensaje a ${contacto}`, resultado.envio.enviado ? 'entregado' : 'no enviado', resultado.envio.enviado ? c.protegido : c.aviso],
            ].map(([a, b, color], i) => (
              <View key={a} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', padding: 14, borderBottomWidth: i < 2 ? 1 : 0, borderBottomColor: c.linea }}>
                <T v="cuerpo15">{a!}</T>
                <T v="dato" color={color}>
                  {b!}
                </T>
              </View>
            ))}
          </Tarjeta>
          {!resultado.envio.enviado && (
            <T v="apoyo" color={c.aviso}>
              El mensaje a tu red todavía no sale: {resultado.envio.detalle}.
            </T>
          )}
          <Tarjeta style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <Icono nombre="candado" color={c.texto} />
            <View style={{ flex: 1, gap: 2 }}>
              <T v="cuerpo15Fuerte">Cancelar con tu PIN</T>
              <T v="apoyo" suave>
                Si fue una falsa alarma, solo tú puedes detenerla. Quien tenga tu celular no puede apagar la protección.
              </T>
            </View>
          </Tarjeta>
          <View style={{ flex: 1 }} />
          <Boton texto="Listo, protégeme" icono="flecha" onPress={terminar} />
          <Boton texto="Probar otra vez" variante="terciario" onPress={probar} />
        </>
      )}
      <PedirPin
        visible={pedirPin}
        crear
        titulo="Crea tu PIN"
        explicacion="Lo necesitarás para cancelar una falsa alarma, pausar o apagar la protección."
        alConfirmar={async (pin) => {
          await guardarPin(pin);
          onListo();
          return true;
        }}
        alCerrar={() => setPedirPin(false)}
      />
    </Pantalla>
  );
}
