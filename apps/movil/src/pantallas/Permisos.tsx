import { useState } from 'react';
import { Platform, View } from 'react-native';
import { ConfiguracionBloqueo } from '../componentes/ConfiguracionBloqueo';
import { servicio } from '../servicio';
import { Boton, Pantalla, Pasos, T, Tarjeta } from '../ui/componentes';
import { Icono, type NombreIcono } from '../ui/iconos';
import { RADIO, useTema } from '../ui/tema';

/**
 * F1 · 2/4 Permisos explicados. Son obligatorios para proteger en segundo plano: los pedimos aquí,
 * explicando para qué sirve cada uno, y si falta alguno lo decimos (protección limitada).
 */
export function Permisos({ onSeguir, onVolver }: { onSeguir: () => void; onVolver: () => void }) {
  const c = useTema();
  const [faltan, setFaltan] = useState<string[] | null>(null);
  const [pidiendo, setPidiendo] = useState(false);

  const permisos: Array<{ icono: NombreIcono; titulo: string; texto: string }> = [
    { icono: 'movimiento', titulo: 'Movimiento del celular', texto: 'Para notar el jalón cuando alguien te lo arrancha. Se analiza en tu celular; no se guarda ni se envía.' },
    {
      icono: 'ubicacion',
      titulo: Platform.OS === 'web' ? 'Ubicación precisa' : 'Ubicación "Permitir siempre"',
      texto: 'Para que tu familia vea dónde fue y por dónde se fueron, aunque estés usando otra app o tengas la pantalla apagada. Solo se comparte si hay una alerta.',
    },
  ];
  if (Platform.OS !== 'web') {
    permisos.push({ icono: 'campana', titulo: 'Notificaciones', texto: 'Para preguntarte "¿Todo bien?" en silencio antes de avisar a nadie.' });
  }

  const pedir = async () => {
    setPidiendo(true);
    const f = await servicio.pedirPermisos().catch(() => ['movimiento', 'ubicación']);
    setPidiendo(false);
    setFaltan(f);
    if (f.length === 0) onSeguir();
  };

  return (
    <Pantalla>
      <Pasos paso={2} total={4} onVolver={onVolver} />
      <View style={{ gap: 8 }}>
        <T v="titulo26" accessibilityRole="header">
          {permisos.length} permisos, y para qué los usamos
        </T>
        <T suave>Tu celular te los va a pedir después de esto.</T>
      </View>
      <View style={{ gap: 12 }}>
        {permisos.map((p) => (
          <Tarjeta key={p.titulo} style={{ flexDirection: 'row', gap: 14 }}>
            <View style={{ width: 44, height: 44, borderRadius: RADIO.total, backgroundColor: c.superficie2, alignItems: 'center', justifyContent: 'center' }}>
              <Icono nombre={p.icono} color={c.texto} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <T v="cuerpoFuerte">{p.titulo}</T>
              <T v="apoyo" suave>
                {p.texto}
              </T>
            </View>
          </Tarjeta>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: 14, borderRadius: RADIO.s, backgroundColor: c.superficie2 }}>
        <Icono nombre="candado" tam={18} color={c.textoSuave} />
        <T v="apoyo" suave style={{ flex: 1 }}>
          No leemos tu agenda ni tus fotos. Nadie ve tu ubicación mientras no haya una alerta.
        </T>
      </View>
      {/* El bloqueo es opcional: no frena el primer uso, pero se ofrece aquí, que es cuando se configura todo. */}
      {Platform.OS !== 'web' && <ConfiguracionBloqueo enBienvenida />}
      {faltan && faltan.length > 0 && (
        <View style={{ flexDirection: 'row', gap: 10, padding: 14, borderRadius: RADIO.s, backgroundColor: c.avisoFondo }}>
          <Icono nombre="escudoAviso" tam={18} color={c.aviso} />
          <T v="apoyo" color={c.aviso} style={{ flex: 1 }}>
            Falta: {faltan.join(', ')}. Sin esto la protección será limitada. Puedes darlo en los ajustes del celular.
          </T>
        </View>
      )}
      <View style={{ flex: 1 }} />
      <Boton texto={pidiendo ? 'Pidiendo permisos…' : faltan?.length ? 'Volver a pedir' : 'Dar permisos'} icono="flecha" onPress={pedir} deshabilitado={pidiendo} />
      <Boton texto="Ahora no (protección limitada)" variante="terciario" onPress={onSeguir} />
    </Pantalla>
  );
}
