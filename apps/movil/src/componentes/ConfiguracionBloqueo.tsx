import { useEffect, useState } from 'react';
import { Alert, AppState, View } from 'react-native';
import {
  abrirBloqueoSeguro,
  bloquearAlDetectar,
  consultarBloqueo,
  solicitarAutorizacionBloqueo,
} from '../bloqueo';
import { Boton, Rotulo, T, Tarjeta } from '../ui/componentes';
import { useTema } from '../ui/tema';

/** Conserva el diseño original y distingue autorización, configuración y orden de bloqueo. */
export function ConfiguracionBloqueo() {
  const c = useTema();
  const [estado, setEstado] = useState(consultarBloqueo);
  const [mensaje, setMensaje] = useState('');
  const [abriendo, setAbriendo] = useState(false);
  const listo =
    estado.disponible && estado.administradorActivo && estado.bloqueoSeguro;
  useEffect(() => {
    const sub = AppState.addEventListener('change', (fase) => {
      if (fase === 'active') setEstado(consultarBloqueo());
    });
    return () => sub.remove();
  }, []);
  const abrir = async (accion: () => Promise<boolean>) => {
    setAbriendo(true);
    try {
      const abierto = await accion();
      setMensaje(
        abierto
          ? 'Completa el ajuste de Android y vuelve a la app para comprobarlo.'
          : 'No pudimos abrir este ajuste. Revisa los ajustes de seguridad de Android.',
      );
    } finally {
      setEstado(consultarBloqueo());
      setAbriendo(false);
    }
  };
  const probar = () =>
    Alert.alert(
      'Probar bloqueo real',
      'El celular se bloqueará. Para entrar necesitarás el PIN, patrón o contraseña de Android, no el PIN de esta app.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Bloquear ahora',
          onPress: () => {
            setMensaje(bloquearAlDetectar().detalle);
            setEstado(consultarBloqueo());
          },
        },
      ],
    );
  return (
    <View style={{ gap: 10 }}>
      <Rotulo>BLOQUEO ANTIRROBO</Rotulo>
      <Tarjeta style={{ gap: 12 }}>
        <T v="cuerpoFuerte">Bloquear al confirmar un arrebato</T>
        <T v="apoyo" suave>
          {estado.detalle}
        </T>
        {estado.disponible && (
          <T v="apoyo13" color={listo ? c.protegido : c.aviso}>
            {listo
              ? 'Preparado para solicitar el bloqueo'
              : 'Configuración pendiente'}
          </T>
        )}
        {estado.disponible && !estado.bloqueoSeguro && (
          <Boton
            texto="Configurar clave de Android"
            variante="secundario"
            deshabilitado={abriendo}
            onPress={() => void abrir(abrirBloqueoSeguro)}
          />
        )}
        {estado.disponible &&
          estado.bloqueoSeguro &&
          !estado.administradorActivo && (
            <Boton
              texto="Autorizar bloqueo automático"
              variante="secundario"
              deshabilitado={abriendo}
              onPress={() => void abrir(solicitarAutorizacionBloqueo)}
            />
          )}
        {listo && (
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
        <T v="apoyo13" suave>
          El bloqueo se solicita inmediatamente al confirmar la huida. La espera
          para avisar a tu red sigue siendo independiente.
        </T>
      </Tarjeta>
    </View>
  );
}
