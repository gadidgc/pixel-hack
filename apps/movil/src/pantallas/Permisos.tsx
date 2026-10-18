import { useState } from 'react';
import { Platform, View } from 'react-native';
import { PasoBienvenida } from '../componentes/PasoBienvenida';
import { servicio } from '../servicio';
import { Boton, T } from '../ui/componentes';
import { Icono, type NombreIcono } from '../ui/iconos';
import { RADIO, useTema } from '../ui/tema';

/** Lo que falta si la persona eligió "Mientras se usa" en vez de "Siempre" (ver servicio.pedirPermisos). */
export const FALTA_SIEMPRE = 'ubicación "Permitir siempre"';

/**
 * F1 · Paso 3: permisos, una línea cada uno. El bloqueo con Atajos y Tiempo de uso ya NO van aquí:
 * se configuran después, desde el aviso de Inicio (ConfiguracionBloqueo).
 * Si falta solo "Siempre" en la ubicación, `onFaltaSiempre` lleva al paso que explica cómo darlo.
 */
export function Permisos({ onSeguir, onFaltaSiempre, onVolver }: { onSeguir: () => void; onFaltaSiempre: () => void; onVolver: () => void }) {
  const c = useTema();
  const [faltan, setFaltan] = useState<string[] | null>(null);
  const [pidiendo, setPidiendo] = useState(false);
  const web = Platform.OS === 'web';

  const permisos: Array<{ icono: NombreIcono; titulo: string; texto: string }> = [
    { icono: 'movimiento', titulo: 'Movimiento', texto: 'Para sentir el jalón.' },
    { icono: 'ubicacion', titulo: web ? 'Ubicación' : 'Ubicación, siempre', texto: 'Para que tu familia sepa dónde fue.' },
  ];
  if (!web) permisos.push({ icono: 'campana', titulo: 'Notificaciones', texto: 'Para preguntarte si estás bien.' });

  const pedir = async () => {
    setPidiendo(true);
    const f = await servicio.pedirPermisos().catch(() => ['movimiento', 'ubicación']);
    setPidiendo(false);
    setFaltan(f);
    // Las notificaciones ayudan pero no son obligatorias (servicio.activar no las exige).
    if (f.every((x) => x === 'notificaciones')) return onSeguir();
    // Solo falta "Siempre": el caso más común en iPhone. Tiene su propio paso, con el camino en Ajustes.
    if (f.every((x) => x === FALTA_SIEMPRE || x === 'notificaciones')) return onFaltaSiempre();
  };

  return (
    <PasoBienvenida
      paso={3}
      onVolver={onVolver}
      titulo={`Activa ${permisos.length} permisos`}
      texto="Tu celular te los pedirá uno por uno."
      abajo={
        <>
          <Boton texto={pidiendo ? 'Pidiendo permisos…' : faltan?.length ? 'Volver a pedir' : 'Dar permisos'} icono="flecha" onPress={pedir} deshabilitado={pidiendo} />
          <Boton texto="Ahora no" variante="terciario" onPress={onSeguir} />
        </>
      }
    >
      <View>
        {permisos.map((p, i) => (
          <View key={p.titulo} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: i < permisos.length - 1 ? 1 : 0, borderBottomColor: c.linea }}>
            <View style={{ width: 44, height: 44, borderRadius: RADIO.total, backgroundColor: c.superficie2, alignItems: 'center', justifyContent: 'center' }}>
              <Icono nombre={p.icono} color={c.texto} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <T v="cuerpoFuerte">{p.titulo}</T>
              <T v="apoyo" suave>
                {p.texto}
              </T>
            </View>
          </View>
        ))}
      </View>
      {faltan && faltan.length > 0 ? (
        <View style={{ flexDirection: 'row', gap: 10, padding: 14, borderRadius: RADIO.s, backgroundColor: c.avisoFondo }}>
          <Icono nombre="escudoAviso" tam={18} color={c.aviso} />
          <T v="apoyo" color={c.aviso} style={{ flex: 1 }}>
            Falta: {faltan.join(', ')}. Sin esto la protección queda limitada. Puedes darlo en los ajustes del celular.
          </T>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', padding: 14, borderRadius: RADIO.s, backgroundColor: c.superficie2 }}>
          <Icono nombre="candado" tam={18} color={c.textoSuave} />
          <T v="apoyo" style={{ flex: 1 }}>
            Nadie ve tu ubicación si no hay una alerta.
          </T>
        </View>
      )}
    </PasoBienvenida>
  );
}
