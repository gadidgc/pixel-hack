import { useEffect, useState } from "react";
import { Alert, AppState, Platform, View } from "react-native";
import {
  abrirBloqueoSeguro,
  abrirPermisoPantallaCompleta,
  appsBloqueadas,
  bloquearAlDetectar,
  consultarBloqueo,
  solicitarAutorizacionBloqueo,
} from "../bloqueo";
import { servicio } from "../servicio";
import { PedirPin } from "./PedirPin";
import { Boton, Rotulo, T, Tarjeta } from "../ui/componentes";
import { useTema } from "../ui/tema";

const esIphone = Platform.OS === "ios";

/** Lo que Apple sí ofrece en iPhone (iOS 17.3+): https://support.apple.com/120340 */
const PASOS_IPHONE = [
  "Ajustes › Face ID y código › Protección en caso de robo: actívala y elige «Siempre». Así, aunque el ladrón vea tu código, no podrá cambiar tu cuenta de Apple ni apagar Buscar sin tu cara.",
  "Ajustes › Pantalla y brillo › Bloqueo automático: 30 segundos.",
];

/**
 * Conserva el diseño original y distingue autorización, configuración y orden de bloqueo.
 * `enBienvenida`: versión corta para el primer uso (sin la prueba real del bloqueo).
 */
export function ConfiguracionBloqueo({
  enBienvenida = false,
}: {
  enBienvenida?: boolean;
}) {
  const c = useTema();
  const [estado, setEstado] = useState(consultarBloqueo);
  const [mensaje, setMensaje] = useState("");
  const [abriendo, setAbriendo] = useState(false);
  // iPhone: las demás apps siguen tapadas (tras una alerta o "Probar bloqueo") hasta escribir el PIN aquí.
  const [tapadas, setTapadas] = useState(appsBloqueadas);
  const [pedirPin, setPedirPin] = useState(false);
  const listo =
    estado.disponible && estado.administradorActivo && estado.bloqueoSeguro;
  useEffect(() => {
    const sub = AppState.addEventListener("change", (fase) => {
      if (fase === "active") {
        setEstado(consultarBloqueo());
        setTapadas(appsBloqueadas());
      }
    });
    return () => sub.remove();
  }, []);
  const abrir = async (accion: () => Promise<boolean>) => {
    setAbriendo(true);
    try {
      const abierto = await accion();
      setMensaje(
        abierto
          ? esIphone
            ? "Listo. Si cambiaste algo en Ajustes, vuelve a la app para comprobarlo."
            : "Completa el ajuste de Android y vuelve a la app para comprobarlo."
          : esIphone
            ? "No se autorizó. Puedes volver a intentarlo cuando quieras."
            : "No pudimos abrir este ajuste. Revisa los ajustes de seguridad de Android.",
      );
    } finally {
      setEstado(consultarBloqueo());
      setAbriendo(false);
    }
  };
  const probar = () =>
    Alert.alert(
      "Probar bloqueo real",
      esIphone
        ? "Se taparán las demás apps del iPhone. Para destaparlas vuelve aquí y escribe el PIN de esta app."
        : "El celular se bloqueará. Para entrar necesitarás el PIN, patrón o contraseña de Android, no el PIN de esta app.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Bloquear ahora",
          onPress: () => {
            setMensaje(bloquearAlDetectar().detalle);
            setEstado(consultarBloqueo());
            setTapadas(appsBloqueadas());
          },
        },
      ],
    );
  return (
    <View style={{ gap: 10 }}>
      <Rotulo>{enBienvenida ? "RECOMENDADO" : "BLOQUEO ANTIRROBO"}</Rotulo>
      <Tarjeta style={{ gap: 12 }}>
        <T v="cuerpoFuerte">
          {esIphone
            ? "Que no puedan usar las apps de tu iPhone"
            : "Bloquear tu celular si te lo arranchan"}
        </T>
        <T v="apoyo" suave>
          {estado.detalle}
        </T>
        {esIphone &&
          PASOS_IPHONE.map((paso, i) => (
            <View key={i} style={{ flexDirection: "row", gap: 8 }}>
              <T v="apoyo" color={c.protegido}>
                {i + 1}.
              </T>
              <T v="apoyo" style={{ flex: 1 }}>
                {paso}
              </T>
            </View>
          ))}
        {estado.disponible && (
          <T v="apoyo13" color={listo ? c.protegido : c.aviso}>
            {listo
              ? "Preparado para solicitar el bloqueo"
              : "Configuración pendiente"}
          </T>
        )}
        {estado.disponible && !estado.bloqueoSeguro && (
          <Boton
            texto={esIphone ? "Abrir Ajustes" : "Configurar clave de Android"}
            variante="secundario"
            deshabilitado={abriendo}
            onPress={() => void abrir(abrirBloqueoSeguro)}
          />
        )}
        {estado.disponible &&
          estado.bloqueoSeguro &&
          !estado.administradorActivo && (
            <Boton
              texto={
                esIphone ? "Autorizar Tiempo de uso" : "Autorizar bloqueo automático"
              }
              variante="secundario"
              deshabilitado={abriendo}
              onPress={() => void abrir(solicitarAutorizacionBloqueo)}
            />
          )}
        {listo && !esIphone && !estado.pantallaCompleta && (
          <Boton
            texto="Permitir el aviso sobre el bloqueo"
            variante="secundario"
            deshabilitado={abriendo}
            onPress={() => void abrir(abrirPermisoPantallaCompleta)}
          />
        )}
        {tapadas && (
          <Boton
            texto="Desbloquear mis apps"
            onPress={() => setPedirPin(true)}
          />
        )}
        {listo && !enBienvenida && !tapadas && (
          <Boton
            texto="Probar bloqueo"
            variante="secundario"
            onPress={probar}
          />
        )}
        {!!mensaje && (
          <T v="apoyo" suave>
            {mensaje}
          </T>
        )}
        {estado.disponible && (
          <T v="apoyo13" suave>
            {esIphone
              ? "Las apps se tapan inmediatamente al confirmar la huida. Si fuiste tú, desbloquea el iPhone y cancela con el PIN de la app: vuelven solas. Llamadas y Ajustes no se tapan (Apple no lo deja)."
              : "El bloqueo se solicita inmediatamente al confirmar la huida. Si fuiste tú, cancelas con el PIN de la app desde la misma pantalla de bloqueo."}
          </T>
        )}
      </Tarjeta>
      <PedirPin
        visible={pedirPin}
        titulo="Desbloquear mis apps"
        explicacion="Escribe el PIN de esta app para destapar las demás apps del iPhone."
        mensajeError={() => servicio.mensajePin()}
        alConfirmar={async (p) => {
          const ok = await servicio.desbloquearApps(p);
          if (ok) {
            setTapadas(appsBloqueadas());
            setMensaje("Tus apps ya se pueden usar.");
          }
          return ok;
        }}
        alCerrar={() => setPedirPin(false)}
      />
    </View>
  );
}
