import { useEffect, useState } from "react";
import { Linking, TextInput, View } from "react-native";
import { hayBackend } from "../alertas";
import { PALABRA_BLOQUEO_ATAJOS } from "../bloqueo";
import { telefonoOculto } from "../preferencias";
import { servicio } from "../servicio";
import { usePreferencias } from "../useProteccion";
import { Boton, T } from "../ui/componentes";
import { FUENTES, RADIO, useTema } from "../ui/tema";

/** Los pasos en la app Atajos (iOS 17+), con los nombres que muestra iPhone en español. */
const PASOS = [
  "Abre la app Atajos › pestaña Automatización › toca +.",
  `Elige «Mensaje». En «El mensaje contiene» escribe ${PALABRA_BLOQUEO_ATAJOS} (con el guion). No elijas remitente.`,
  "Marca «Ejecutar inmediatamente» y toca Siguiente.",
  "Toca «Nuevo atajo en blanco», busca la acción «Bloquear pantalla» y agrégala.",
  "Escribe tu número aquí abajo y toca Probar: te llegará un SMS y tu iPhone se bloqueará.",
];

/**
 * Que sea más difícil dejarlo sin señal: sin señal no llega el SMS que lo bloquea. Con el iPhone bloqueado, el
 * modo avión sale del Centro de control (o de Siri); si se apagan en la pantalla de bloqueo, el ladrón necesita
 * el código. No evita que lo apaguen con los botones. Ajustes no deja abrir esa pantalla desde una app.
 */
const PASOS_SIN_SENAL = [
  "Abre Ajustes › Face ID y código (o Touch ID y código) y escribe tu código.",
  "Baja hasta «Permitir acceso cuando está bloqueado» y apaga «Centro de control» y «Siri».",
  "En esa misma pantalla, activa «Protección de dispositivo robado»: protege tus claves y tu cuenta de Apple.",
];

/** Lista numerada de pasos, con el número en verde. */
function ListaPasos({ pasos }: { pasos: string[] }) {
  const c = useTema();
  return pasos.map((paso, i) => (
    <View key={i} style={{ flexDirection: "row", gap: 8 }}>
      <T v="apoyo" color={c.protegido}>
        {i + 1}.
      </T>
      <T v="apoyo" style={{ flex: 1 }}>
        {paso}
      </T>
    </View>
  ));
}

/**
 * iPhone: Apple no deja que una app bloquee la pantalla, pero Atajos sí. La dueña crea una vez la
 * automatización "Al recibir un SMS con la palabra → Bloquear pantalla" y, al confirmar un arrebato, el
 * backend le manda ese SMS a su número. Necesita señal: tarda unos segundos (el escudo de Tiempo de uso no).
 */
export function GuiaAtajos() {
  const c = useTema();
  const numeroPropio = usePreferencias()?.numeroPropio ?? "";
  const [numero, setNumero] = useState(numeroPropio);
  // Las preferencias cargan después del primer render: mostramos el número guardado en cuanto llega.
  useEffect(() => {
    if (numeroPropio) setNumero((actual) => actual || numeroPropio);
  }, [numeroPropio]);
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const conBackend = hayBackend();

  const probar = async () => {
    const limpio = numero.replace(/[\s()-]/g, "");
    if (!/^(\+?\d{9,15})$/.test(limpio))
      return setMensaje("Escribe tu celular (9 dígitos).");
    setEnviando(true);
    try {
      const r = await servicio.probarBloqueoPorMensaje(limpio);
      setMensaje(
        r.enviado
          ? "SMS enviado. Si tu iPhone no se bloquea en unos segundos, revisa los pasos 2 a 4."
          : `No se pudo mandar el SMS: ${r.detalle}`,
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <View style={{ gap: 10 }}>
      <T v="cuerpoFuerte">Bloqueo de verdad con Atajos</T>
      <T v="apoyo" suave>
        Si te lo arranchan, te mandamos un SMS y tu iPhone se bloquea solo:
        el ladrón necesitará tu código. Se configura una vez, en un minuto.
        Necesita iOS 17 o más.
      </T>
      <ListaPasos pasos={PASOS} />
      <Boton
        texto="Abrir Atajos"
        variante="secundario"
        principal={false}
        onPress={() => void Linking.openURL("shortcuts://").catch(() => undefined)}
      />
      <TextInput
        style={{
          backgroundColor: c.superficie2,
          borderRadius: RADIO.s,
          paddingHorizontal: 16,
          minHeight: 52,
          color: c.texto,
          fontFamily: FUENTES.texto,
          fontSize: 16,
        }}
        value={numero}
        onChangeText={setNumero}
        placeholder="Tu celular (9 dígitos)"
        placeholderTextColor={c.textoSuave}
        keyboardType="phone-pad"
        accessibilityLabel="Tu propio número de celular"
      />
      <Boton
        texto={enviando ? "Enviando…" : "Probar"}
        variante="secundario"
        deshabilitado={enviando || !conBackend}
        onPress={() => void probar()}
      />
      {!conBackend && (
        <T v="apoyo13" color={c.aviso}>
          Esta versión no está conectada al servidor: no puede mandar el SMS.
        </T>
      )}
      {!!mensaje && (
        <T v="apoyo" suave>
          {mensaje}
        </T>
      )}
      <T v="apoyo13" color={numeroPropio ? c.protegido : c.aviso}>
        {numeroPropio
          ? `Listo: al confirmar un arrebato mandaremos el SMS a ${telefonoOculto(numeroPropio)}.`
          : "Pendiente: prueba con tu número para activarlo."}
      </T>
      <T v="cuerpoFuerte" style={{ marginTop: 8 }}>
        Que no lo dejen sin señal tan fácil
      </T>
      <T v="apoyo" suave>
        Sin señal (modo avión o apagado), el SMS no llega y tu iPhone no se
        bloquea; tu red igual recibe la alerta. Así el ladrón necesitará tu
        código para poner el modo avión (apagarlo con los botones sí puede):
      </T>
      <ListaPasos pasos={PASOS_SIN_SENAL} />
    </View>
  );
}
