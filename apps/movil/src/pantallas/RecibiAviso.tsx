import { useState } from 'react';
import { KeyboardAvoidingView, Platform, TextInput, View } from 'react-native';
import { urlBackend } from '../alertas';
import { useEstiloCampo } from '../componentes/PasoBienvenida';
import { Boton, Pantalla, Pasos, T } from '../ui/componentes';
import { useTema } from '../ui/tema';
import { ContactoEnVivo } from './ContactoEnVivo';

/**
 * "Recibí un aviso" (solo en la web: alerta.gadidgc.com/aviso): el contacto escribe el código que le llegó por
 * SMS (o que le leyó la llamada) y ve la misma página en vivo que abre el enlace de WhatsApp: ruta, "Yo me
 * encargo" y "Sí, fue un robo". Existe porque Zavu rechaza nuestros enlaces en SMS. No hace falta la app.
 */
export function RecibiAviso({ onVolver }: { onVolver?: () => void }) {
  const c = useTema();
  const campo = useEstiloCampo();
  const [codigo, setCodigo] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState('');
  const [abierto, setAbierto] = useState<{ id: string; contacto: number | null } | null>(null);
  const limpio = codigo.replace(/[\s-]/g, '');
  const listo = limpio.length >= 7;

  const ver = async () => {
    if (!listo || buscando) return;
    setBuscando(true);
    setError('');
    try {
      const r = await fetch(`${urlBackend()}/api/codigo/${encodeURIComponent(limpio)}`, { cache: 'no-store' });
      const d = (await r.json().catch(() => ({}))) as { id?: string; contacto?: number | null; detalle?: string };
      if (r.ok && d.id) setAbierto({ id: d.id, contacto: d.contacto ?? null });
      else setError(d.detalle ? `No se pudo abrir: ${d.detalle}.` : 'No se pudo abrir el aviso. Revisa el código.');
    } catch {
      setError('Sin conexión. Revisa tu internet e inténtalo otra vez.');
    } finally {
      setBuscando(false);
    }
  };

  if (abierto) return <ContactoEnVivo key={abierto.id} id={abierto.id} contacto={abierto.contacto} onCerrar={() => setAbierto(null)} />;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Pantalla>
        <Pasos paso={1} total={1} onVolver={onVolver} />
        <View style={{ gap: 8 }}>
          <T v="estado" accessibilityRole="header">
            Recibí un aviso
          </T>
          <T suave>Escribe el código que te llegó por mensaje de texto o que te dijeron en la llamada.</T>
        </View>
        <TextInput
          style={[campo, { letterSpacing: 4, fontSize: 24 }]}
          value={codigo}
          onChangeText={(t) => setCodigo(t.toUpperCase())}
          placeholder="28KAAK1"
          placeholderTextColor={c.textoSuave}
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="off"
          maxLength={12}
          autoFocus
          returnKeyType="go"
          onSubmitEditing={ver}
          accessibilityLabel="Código del aviso"
        />
        {!!error && (
          <T v="apoyo" color={c.aviso}>
            {error}
          </T>
        )}
        <View style={{ flex: 1 }} />
        <Boton texto={buscando ? 'Buscando…' : 'Ver aviso'} icono="flecha" onPress={ver} deshabilitado={!listo || buscando} />
      </Pantalla>
    </KeyboardAvoidingView>
  );
}
