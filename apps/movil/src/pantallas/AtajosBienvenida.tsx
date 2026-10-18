import { useRef, useState } from 'react';
import { Linking, TextInput, View } from 'react-native';
import { hayBackend } from '../alertas';
import { PALABRA_BLOQUEO_ATAJOS } from '../bloqueo';
import { PasoBienvenida, TOTAL_PASOS, useEstiloCampo } from '../componentes/PasoBienvenida';
import { guardarPreferencias } from '../preferencias';
import { servicio } from '../servicio';
import { usePreferencias } from '../useProteccion';
import { Boton, T } from '../ui/componentes';
import { Icono } from '../ui/iconos';
import { FUENTES, RADIO, useTema } from '../ui/tema';

/** El paso del bloqueo es el penúltimo: después viene la prueba con el contacto. */
const PASO = TOTAL_PASOS - 1;

/**
 * F1 · Paso 5 (solo iPhone): el bloqueo de verdad con Atajos. Apple no deja que una app bloquee la pantalla,
 * pero Atajos sí: la dueña crea una vez "Al recibir un SMS con la palabra → Bloquear pantalla" y, al
 * confirmar un arrebato, el backend le manda ese SMS (GuiaAtajos tiene la versión larga, en Tú › Bloqueo).
 * Dos pantallas: los 4 pasos en Atajos y luego probarlo con su número. Se puede dejar para después.
 */
export function AtajosBienvenida({ onSeguir, onVolver }: { onSeguir: () => void; onVolver: () => void }) {
  const [parte, setParte] = useState<'pasos' | 'probar'>('pasos');
  if (parte === 'probar') return <Probar onSeguir={onSeguir} onVolver={() => setParte('pasos')} />;
  return <Pasos onProbar={() => setParte('probar')} onSeguir={onSeguir} onVolver={onVolver} />;
}

function Pasos({ onProbar, onSeguir, onVolver }: { onProbar: () => void; onSeguir: () => void; onVolver: () => void }) {
  const c = useTema();
  const fuerte = (t: string) => <T v="cuerpoFuerte">{t}</T>;
  const pasos = [
    <>Abre {fuerte('Atajos')} › Automatización › {fuerte('+')}</>,
    <>
      Elige {fuerte('Mensaje')}. En «El mensaje contiene» escribe{' '}
      <T v="dato" color={c.protegido}>
        {PALABRA_BLOQUEO_ATAJOS}
      </T>
    </>,
    <>Marca {fuerte('Ejecutar inmediatamente')} › Siguiente</>,
    <>Nuevo atajo en blanco › agrega {fuerte('Bloquear pantalla')}</>,
  ];

  const abrirAtajos = () => {
    // Al volver de Atajos ya toca probar: dejamos lista esa pantalla (solo si Atajos sí se abrió).
    Linking.openURL('shortcuts://').then(onProbar, () => undefined);
  };

  return (
    <PasoBienvenida
      paso={PASO}
      onVolver={onVolver}
      titulo="Que tu iPhone se bloquee solo"
      texto="Si te lo arranchan, te mandamos un SMS y se bloquea. El ladrón necesitará tu código."
      abajo={
        <>
          <Boton texto="Abrir Atajos" icono="flecha" onPress={abrirAtajos} />
          <Boton texto="Ya lo configuré" variante="secundario" principal={false} onPress={onProbar} />
          <Boton texto="Lo hago después" variante="terciario" onPress={onSeguir} />
        </>
      }
    >
      <View>
        {pasos.map((paso, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 14, paddingVertical: 11, borderBottomWidth: i < pasos.length - 1 ? 1 : 0, borderBottomColor: c.linea }}>
            <T v="dato" color={c.protegido} style={{ width: 14, lineHeight: 24 }}>
              {String(i + 1)}
            </T>
            <T style={{ flex: 1 }}>{paso}</T>
          </View>
        ))}
      </View>
    </PasoBienvenida>
  );
}

function Probar({ onSeguir, onVolver }: { onSeguir: () => void; onVolver: () => void }) {
  const c = useTema();
  const campo = useEstiloCampo();
  const prefs = usePreferencias();
  const [numero, setNumero] = useState<string | null>(null);
  const valor = numero ?? prefs?.numeroPropio ?? '';
  const [enviando, setEnviando] = useState(false);
  // Número del último intento: tras enviarlo se pregunta "¿Se bloqueó?" aunque la respuesta no llegue.
  const [intentado, setIntentado] = useState<string | null>(null);
  const [error, setError] = useState('');
  // Ref y no estado: dos toques seguidos no deben mandar dos SMS (cada uno cuesta).
  const enCurso = useRef(false);
  const conBackend = hayBackend();

  const probar = async () => {
    if (enCurso.current || !conBackend) return;
    const limpio = valor.replace(/[\s()-]/g, '');
    if (!/^\+?\d{9,15}$/.test(limpio)) return setError('Escribe tu celular (9 números).');
    setError('');
    enCurso.current = true;
    setEnviando(true);
    try {
      // Si el SMS sale, el servicio guarda el número: desde ahí el arrebato confirmado bloquea el iPhone.
      const r = await servicio.probarBloqueoPorMensaje(limpio);
      // Si el iPhone se bloquea antes de que conteste el servidor, la app queda en pausa y la respuesta
      // llega como error aunque el SMS sí salió. Por eso igual preguntamos "¿Se bloqueó?".
      if (!r.enviado) setError(`Puede que el SMS no haya salido: ${r.detalle}`);
      setIntentado(limpio);
    } finally {
      enCurso.current = false;
      setEnviando(false);
    }
  };

  const seBloqueo = async () => {
    // Se bloqueó: el SMS llegó. Guardamos el número aunque la respuesta del servidor se haya perdido.
    if (intentado) await guardarPreferencias({ numeroPropio: intentado });
    onSeguir();
  };

  return (
    <PasoBienvenida
      paso={PASO}
      onVolver={onVolver}
      titulo="Pruébalo"
      texto="Te mandamos el SMS a tu número. Tu iPhone debería bloquearse en unos segundos."
      abajo={
        <>
          <Boton
            texto={enviando ? 'Enviando…' : intentado ? 'Probar otra vez' : 'Probar bloqueo'}
            icono="candado"
            variante={intentado ? 'secundario' : 'proteger'}
            onPress={probar}
            deshabilitado={enviando || !conBackend}
          />
          <Boton texto="Lo hago después" variante="terciario" onPress={onSeguir} />
        </>
      }
    >
      <View style={{ gap: 6 }}>
        <T v="apoyo" suave>
          Tu celular
        </T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.superficie2, borderRadius: RADIO.s, paddingLeft: 16, minHeight: 56 }}>
          <T v="dato" suave>
            +51
          </T>
          <TextInput
            style={[campo, { flex: 1, paddingHorizontal: 0, backgroundColor: 'transparent', fontFamily: FUENTES.datosMedio }]}
            value={valor}
            onChangeText={setNumero}
            placeholder="912 345 678"
            placeholderTextColor={c.textoSuave}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            onSubmitEditing={probar}
            accessibilityLabel="Tu propio número de celular"
          />
        </View>
      </View>
      {!conBackend && (
        <T v="apoyo" color={c.aviso}>
          Esta versión no está conectada al servidor: no puede mandar el SMS.
        </T>
      )}
      {!!error && (
        <T v="apoyo" color={intentado ? c.aviso : c.alerta}>
          {error}
        </T>
      )}
      {intentado && !enviando && (
        <View style={{ gap: 12, padding: 16, borderRadius: RADIO.m, backgroundColor: c.superficie, borderTopWidth: 1, borderTopColor: c.brillo }}>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Icono nombre="check" tam={20} color={c.protegido} grosor={2.2} />
            <T v="cuerpoFuerte" style={{ flex: 1 }}>
              {error ? '¿Se bloqueó tu iPhone igual?' : 'SMS enviado. ¿Se bloqueó tu iPhone?'}
            </T>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Boton texto="Sí, se bloqueó" principal={false} flex onPress={() => void seBloqueo()} />
            <Boton texto="No, ver pasos" variante="secundario" principal={false} flex onPress={onVolver} />
          </View>
        </View>
      )}
    </PasoBienvenida>
  );
}
