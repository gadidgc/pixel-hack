import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Pantalla, Rotulo, T, Tarjeta } from '../ui/componentes';
import { Icono } from '../ui/iconos';
import { COLORES, RADIO, TemaContexto, useTema } from '../ui/tema';

interface PasoGuia {
  titulo: string;
  detalle: string;
}

/** Lo que conviene hacer en la primera hora, en este orden (la propuesta de Cesar, docs/funcionalidades-app.md §4.5). */
const PASOS: PasoGuia[] = [
  {
    titulo: 'Suspende tu línea con tu operadora',
    detalle:
      'Lo más urgente: así no pueden recibir tus códigos por SMS para entrar a Yape, Plin o tu banco. Llama a tu operadora desde otro celular o entra a su web; pide la suspensión por robo.',
  },
  { titulo: 'Pide que bloqueen el celular (IMEI) en la misma llamada', detalle: 'Con el IMEI bloqueado, el celular no funciona en ninguna red del Perú.' },
  { titulo: 'Cambia las claves de tu correo y de tus bancos', detalle: 'Empieza por el correo: desde ahí se pueden recuperar las demás cuentas. Cierra las sesiones abiertas en el celular robado.' },
  { titulo: 'Haz la denuncia en la comisaría', detalle: 'Lleva la hora y el lugar del robo. La denuncia sirve para el seguro y para el bloqueo del IMEI.' },
];

/**
 * F6 · Me robaron (desde otro celular, tema Día). Una guía paso a paso para la primera hora.
 * Funciona sin cuenta: es información, no toca datos de nadie.
 */
export function MeRobaron({ nombre, onCerrar }: { nombre?: string; onCerrar?: () => void }) {
  return (
    <TemaContexto.Provider value={COLORES.dia}>
      <Contenido nombre={nombre} onCerrar={onCerrar} />
    </TemaContexto.Provider>
  );
}

function Contenido({ nombre, onCerrar }: { nombre?: string; onCerrar?: () => void }) {
  const c = useTema();
  const [hechos, setHechos] = useState<boolean[]>(PASOS.map(() => false));
  const siguiente = hechos.findIndex((h) => !h);
  const cuantos = hechos.filter(Boolean).length;

  return (
    <Pantalla>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 }}>
        <T v="cuerpoFuerte">Alerta Arrebato</T>
        {onCerrar ? (
          <Pressable onPress={onCerrar} accessibilityRole="button" accessibilityLabel="Cerrar" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Icono nombre="cerrar" color={c.texto} />
          </Pressable>
        ) : null}
      </View>
      <View style={{ gap: 6 }}>
        <T v="titulo" accessibilityRole="header">
          {nombre ? `Hola, ${nombre}. Vamos paso a paso.` : 'Te robaron el celular. Vamos paso a paso.'}
        </T>
        <T v="cuerpo15" suave>
          Respira. Esto es lo que conviene hacer, en este orden.
        </T>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Rotulo>QUÉ HACER AHORA</Rotulo>
        <T v="hora" suave>
          {cuantos} de {PASOS.length}
        </T>
      </View>

      <Tarjeta style={{ padding: 0, overflow: 'hidden' }}>
        {PASOS.map((p, i) => {
          const hecho = hechos[i]!;
          const actual = i === siguiente;
          return (
            <Pressable
              key={p.titulo}
              onPress={() => setHechos(hechos.map((h, j) => (j === i ? !h : h)))}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: hecho }}
              style={{ padding: 14, gap: 8, borderBottomWidth: i < PASOS.length - 1 ? 1 : 0, borderBottomColor: c.linea, backgroundColor: actual ? c.avisoFondo : undefined }}
            >
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <View style={{ width: 24, height: 24, borderRadius: RADIO.total, backgroundColor: hecho ? c.protegido : c.superficie2, alignItems: 'center', justifyContent: 'center' }}>
                  {hecho ? <Icono nombre="check" tam={14} color={c.sobreProtegido} grosor={2.6} /> : <T v="hora" color={actual ? c.aviso : c.textoSuave}>{String(i + 1)}</T>}
                </View>
                <T v={actual ? 'cuerpoFuerte' : 'cuerpo15'} style={{ flex: 1, textDecorationLine: hecho ? 'line-through' : 'none' }}>
                  {p.titulo}
                </T>
              </View>
              {actual && (
                <T v="apoyo" suave style={{ paddingLeft: 34 }}>
                  {p.detalle}
                </T>
              )}
            </Pressable>
          );
        })}
      </Tarjeta>

      <T v="apoyo13" suave style={{ textAlign: 'center' }}>
        Si estás en peligro, llama al 105. Si usas un celular prestado, no inicies sesión en tus cuentas aquí.
      </T>
    </Pantalla>
  );
}
