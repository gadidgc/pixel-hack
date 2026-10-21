import { useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { MAX_NOTA, buscarNotas, guardarNota, olvidarNota, type Nota } from '../memoria';
import { Boton, Rotulo, T, Tarjeta } from '../ui/componentes';
import { FUENTES, RADIO, useTema } from '../ui/tema';

/**
 * "Tus notas de falsas alarmas" (Atomic Memory, opcional). Muestra las notas de antes más parecidas al motivo
 * elegido y deja guardar, corregir u olvidar una. Solo se muestra después de cancelar la alerta con el PIN
 * (pantallas/FalsaAlarma.tsx) y si el backend tiene la memoria configurada: quien tenga el celular robado no
 * las ve. Es solo un recordatorio: no cambia el detector, la alerta ni a quién se avisa.
 */
export function NotasFalsaAlarma({ motivo }: { motivo: string | null }) {
  const c = useTema();
  const [notas, setNotas] = useState<Nota[]>([]);
  const [texto, setTexto] = useState('');
  const [corrigiendo, setCorrigiendo] = useState<Nota | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; error: boolean } | null>(null);

  useEffect(() => {
    let vigente = true;
    void buscarNotas(motivo).then((r) => {
      if (!vigente) return;
      if (r.ok) setNotas(r.datos);
      else setAviso({ texto: `No pudimos traer tus notas: ${r.motivo}.`, error: true });
    });
    return () => {
      vigente = false;
    };
  }, [motivo]);

  const guardar = async () => {
    const limpio = texto.trim();
    if (!limpio || ocupado) return;
    setOcupado(true);
    setAviso(null);
    const r = await guardarNota(limpio, motivo ?? corrigiendo?.motivo ?? null, corrigiendo?.id);
    setOcupado(false);
    if (!r.ok) {
      // Nunca "guardada" si el servidor no lo confirmó: el texto se queda en el campo para reintentar.
      setAviso({ texto: `No pudimos confirmar que se guardó: ${r.motivo}.`, error: true });
      return;
    }
    const nueva: Nota = { id: r.datos.id, texto: limpio, motivo: motivo ?? corrigiendo?.motivo ?? null };
    setNotas((antes) => [nueva, ...antes.filter((n) => n.id !== corrigiendo?.id || r.datos.anteriorBorrada === false)]);
    setAviso(
      corrigiendo && r.datos.anteriorBorrada === false
        ? { texto: 'Guardamos la corrección, pero la nota anterior no se pudo borrar.', error: true }
        : { texto: corrigiendo ? 'Nota corregida.' : 'Nota guardada. La verás la próxima falsa alarma.', error: false },
    );
    setTexto('');
    setCorrigiendo(null);
  };

  const olvidar = async (nota: Nota) => {
    if (ocupado) return;
    setOcupado(true);
    setAviso(null);
    const r = await olvidarNota(nota.id);
    setOcupado(false);
    if (!r.ok) {
      setAviso({ texto: `No pudimos confirmar que se borró: ${r.motivo}.`, error: true });
      return;
    }
    setNotas((antes) => antes.filter((n) => n.id !== nota.id));
    if (corrigiendo?.id === nota.id) {
      setCorrigiendo(null);
      setTexto('');
    }
    setAviso({ texto: 'Nota olvidada.', error: false });
  };

  const enlace = (etiqueta: string, accion: () => void, accesible: string) => (
    <Pressable onPress={accion} disabled={ocupado} accessibilityRole="button" accessibilityLabel={accesible} hitSlop={8}>
      <T v="apoyo13" color={c.texto} style={{ textDecorationLine: 'underline' }}>
        {etiqueta}
      </T>
    </Pressable>
  );

  return (
    <View style={{ gap: 8 }}>
      <Rotulo>TUS NOTAS DE FALSAS ALARMAS (SOLO PARA TI)</Rotulo>
      {notas.map((n) => (
        <Tarjeta key={n.id} style={{ gap: 6 }}>
          <T v="cuerpo15">{n.texto}</T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            {n.motivo && (
              <T v="apoyo13" suave style={{ flex: 1 }}>
                {n.motivo}
              </T>
            )}
            {!n.motivo && <View style={{ flex: 1 }} />}
            {enlace('Corregir', () => {
              setCorrigiendo(n);
              setTexto(n.texto);
              setAviso(null);
            }, `Corregir la nota: ${n.texto}`)}
            {enlace('Olvidar', () => void olvidar(n), `Olvidar la nota: ${n.texto}`)}
          </View>
        </Tarjeta>
      ))}
      <TextInput
        value={texto}
        onChangeText={setTexto}
        maxLength={MAX_NOTA}
        placeholder={corrigiendo ? 'Corrige tu nota' : 'Ej.: pasa cuando corro para alcanzar la combi'}
        placeholderTextColor={c.textoSuave}
        accessibilityLabel={corrigiendo ? 'Corregir la nota' : 'Nota para recordar qué causó la falsa alarma'}
        style={{ backgroundColor: c.superficie2, borderRadius: RADIO.s, paddingHorizontal: 16, minHeight: 52, color: c.texto, fontFamily: FUENTES.texto, fontSize: 16 }}
      />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Boton texto={ocupado ? 'Guardando…' : corrigiendo ? 'Guardar corrección' : 'Guardar nota'} variante="secundario" deshabilitado={!texto.trim() || ocupado} onPress={() => void guardar()} flex />
        {corrigiendo && (
          <Boton
            texto="Cancelar"
            variante="terciario"
            onPress={() => {
              setCorrigiendo(null);
              setTexto('');
            }}
            flex
          />
        )}
      </View>
      {aviso && (
        <T v="apoyo13" color={aviso.error ? c.alerta : c.protegido} accessibilityRole="alert">
          {aviso.texto}
        </T>
      )}
      <T v="apoyo13" suave>
        Se guarda en Atomic Memory solo si tocas «Guardar». No cambia cómo detecta Vigía ni a quién avisa. No escribas direcciones ni datos de otras personas.
      </T>
    </View>
  );
}
