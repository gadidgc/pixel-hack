import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { ENTIDADES, OPERADORES, guardarPreferencias, type PerfilBloqueo } from '../preferencias';
import { usePreferencias } from '../useProteccion';
import { Boton, Chip, Pantalla, Pasos, Rotulo, T } from '../ui/componentes';
import { FUENTES, RADIO, useTema } from '../ui/tema';

/**
 * "Para bloquear tus cuentas": lo que tu red necesita si confirma que te robaron. Se llena una vez.
 * Nada de esto se le muestra a nadie hasta que alguien de tu red confirme el robo.
 */
export function BloqueoCuentas({ onVolver }: { onVolver: () => void }) {
  const c = useTema();
  const prefs = usePreferencias();
  const [borrador, setBorrador] = useState<PerfilBloqueo | null>(null);
  // El error va debajo de su campo, no al final de la pantalla.
  const [errores, setErrores] = useState<Partial<Record<'linea' | 'imei' | 'dni', string>>>({});
  if (!prefs) return null;
  const p = borrador ?? prefs.bloqueo;
  const cambiar = (cambios: Partial<PerfilBloqueo>) => setBorrador({ ...p, ...cambios });
  const alternar = (id: string) => cambiar({ entidades: p.entidades.includes(id) ? p.entidades.filter((e) => e !== id) : [...p.entidades, id] });

  const guardar = async () => {
    const linea = p.linea.replace(/\D/g, '').replace(/^51(?=9\d{8}$)/, '');
    const imei = p.imei.replace(/\D/g, '');
    const dni = p.dni.replace(/\s/g, '');
    const nuevos: typeof errores = {};
    if (linea && !/^9\d{8}$/.test(linea)) nuevos.linea = 'Tu número debe tener 9 dígitos y empezar con 9.';
    if (imei && !/^\d{14,16}$/.test(imei)) nuevos.imei = 'El IMEI tiene 15 números. Revisa que esté completo.';
    if (dni && !/^[0-9A-Za-z]{8,12}$/.test(dni)) nuevos.dni = 'El DNI tiene 8 números (el carné de extranjería, hasta 12).';
    setErrores(nuevos);
    if (Object.keys(nuevos).length) return;
    await guardarPreferencias({ bloqueo: { ...p, linea, imei, dni } });
    onVolver();
  };

  const campo = (error?: string, fuente: string = FUENTES.datos) => ({
    backgroundColor: c.superficie2,
    borderRadius: RADIO.s,
    paddingHorizontal: 16,
    minHeight: 52,
    color: c.texto,
    fontFamily: fuente,
    fontSize: 16,
    borderWidth: error ? 2 : 0,
    borderColor: c.alerta,
  });
  const ErrorDe = ({ texto }: { texto?: string }) =>
    texto ? (
      <T v="apoyo" color={c.alerta}>
        {texto}
      </T>
    ) : null;

  return (
    <Pantalla>
      <Pasos paso={1} total={1} onVolver={onVolver} />
      <View style={{ gap: 8 }}>
        <T v="titulo26" accessibilityRole="header">
          Para bloquear tus cuentas
        </T>
        <T suave>
          Si alguien de tu red confirma que te robaron, verá estos datos y los números para bloquear tus bancos y tu línea. Antes de eso, nadie los ve.
        </T>
      </View>

      <View style={{ gap: 10 }}>
        <Rotulo>QUÉ USAS</Rotulo>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {ENTIDADES.map((e) => (
            <Chip key={e.id} texto={e.nombre} activo={p.entidades.includes(e.id)} onPress={() => alternar(e.id)} />
          ))}
        </View>
      </View>

      <View style={{ gap: 10 }}>
        <Rotulo>TU OPERADORA</Rotulo>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {OPERADORES.map((o) => (
            <Chip key={o.id} texto={o.nombre} activo={p.operador === o.id} onPress={() => cambiar({ operador: p.operador === o.id ? null : o.id })} />
          ))}
        </View>
      </View>

      <View style={{ gap: 10 }}>
        <Rotulo>TU NÚMERO</Rotulo>
        <TextInput style={campo(errores.linea)} value={p.linea} onChangeText={(linea) => cambiar({ linea })} placeholder="Ej.: 987 654 321" placeholderTextColor={c.textoSuave} keyboardType="phone-pad" accessibilityLabel="Tu número de celular" />
        <ErrorDe texto={errores.linea} />
      </View>

      <View style={{ gap: 10 }}>
        <Rotulo>IMEI DE ESTE CELULAR</Rotulo>
        <TextInput style={campo(errores.imei)} value={p.imei} onChangeText={(imei) => cambiar({ imei })} placeholder="15 números" placeholderTextColor={c.textoSuave} keyboardType="number-pad" accessibilityLabel="IMEI de este celular" />
        <ErrorDe texto={errores.imei} />
        <T v="apoyo" suave>
          Para verlo, marca *#06# en este celular. Con el IMEI, la operadora bloquea el celular más rápido.
        </T>
      </View>

      <View style={{ gap: 10 }}>
        <Rotulo>DNI (OPCIONAL)</Rotulo>
        <TextInput style={campo(errores.dni, p.dni ? FUENTES.datos : FUENTES.texto)} value={p.dni} onChangeText={(dni) => cambiar({ dni })} placeholder="Opcional" placeholderTextColor={c.textoSuave} autoCapitalize="characters" accessibilityLabel="DNI, opcional" />
        <ErrorDe texto={errores.dni} />
        <T v="apoyo" suave>
          El banco y la operadora lo piden. Si no lo guardas, tu familia tendrá que saberlo. Nunca te pediremos claves ni números de tarjeta.
        </T>
      </View>

      <View style={{ flex: 1 }} />
      <Boton texto="Guardar" icono="check" onPress={() => void guardar()} />
    </Pantalla>
  );
}
