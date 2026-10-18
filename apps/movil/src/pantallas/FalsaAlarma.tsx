import { useState } from 'react';
import { Share, View } from 'react-native';
import { PedirPin } from '../componentes/PedirPin';
import { useProteccion, usePreferencias } from '../useProteccion';
import { Boton, Chip, Insignia, LineaDeTiempo, Pantalla, Rotulo, T, hora } from '../ui/componentes';

const MOTIVOS = ['Iba en auto o taxi', 'Subí a un bus o combi', 'Se me cayó', 'Corrí', 'Otra cosa'];

/**
 * F4 · Fue falsa alarma: la red ya fue avisada (o se intentó). Cuenta qué pasó, deja avisar que estás
 * bien (con PIN) y, opcionalmente, decir qué pasó para mejorar el detector.
 */
export function FalsaAlarma({ onVerAviso, onCerrar }: { onVerAviso: () => void; onCerrar: () => void }) {
  const { estado, servicio } = useProteccion();
  const prefs = usePreferencias();
  const [pin, setPin] = useState(false);
  const [motivo, setMotivo] = useState<string | null>(null);
  const alerta = estado.alerta;
  if (!alerta) return null;
  const quienes = prefs?.contactos.map((x) => x.nombre).join(', ') || 'tu red';
  const avisada = alerta.familia === 'avisada';
  const enviando = alerta.familia === 'enviando' || alerta.familia === 'esperando';
  const minutos = alerta.tFamilia ? Math.max(0, Math.round((Date.now() - alerta.tFamilia) / 60000)) : 0;

  const elegir = (m: string) => {
    setMotivo(m);
    servicio.enviarMotivo(m);
  };

  return (
    <Pantalla>
      <Insignia tipo={avisada ? 'alerta' : 'aviso'} texto={avisada ? 'ALERTA ENVIADA' : enviando ? 'AVISANDO…' : 'NO SE PUDO AVISAR'} />
      <View style={{ gap: 8 }}>
        <T v="titulo26" accessibilityRole="header">
          {avisada ? `${quienes} recibió una alerta${minutos ? ` hace ${minutos} min` : ''}` : enviando ? `Avisando a ${quienes}…` : `No pudimos avisar a ${quienes}`}
        </T>
        <T suave>
          {avisada
            ? 'No respondiste a "¿Todo bien?" a tiempo, así que avisamos. Si tienes tu celular, cuéntale que estás bien.'
            : enviando
              ? 'Si fue tuyo, confírmalo con tu PIN.'
              : `El aviso no salió del celular (${alerta.detalleFamilia}). Si te robaron, pide ayuda desde otro celular.`}
        </T>
      </View>

      {alerta.bloqueo && <T v="apoyo" suave>Bloqueo del sistema: {alerta.bloqueo.detalle}</T>}
      <LineaDeTiempo pasos={alerta.pasos.map((p) => ({ hora: hora(p.t, true), texto: p.texto, clave: p.clave }))} />

      <View style={{ gap: 8 }}>
        <Rotulo>¿QUÉ PASÓ? (OPCIONAL, NOS AYUDA A MEJORAR)</Rotulo>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {MOTIVOS.map((m) => (
            <Chip key={m} texto={m} activo={motivo === m} onPress={() => elegir(m)} />
          ))}
        </View>
      </View>

      <View style={{ flex: 1 }} />
      <Boton texto={avisada ? 'Fue falsa alarma: avisar que estoy bien' : 'Fue falsa alarma'} icono="huella" onPress={() => setPin(true)} />
      <Boton texto={`Ver lo que recibió ${quienes}`} variante="terciario" onPress={onVerAviso} />
      {alerta.enlace && (
        <Boton
          texto="Compartir el enlace en vivo"
          variante="terciario"
          icono="compartir"
          onPress={() => void Share.share({ message: `Ruta en vivo de mi celular: ${alerta.enlace}`, url: alerta.enlace ?? undefined }).catch(() => undefined)}
        />
      )}
      <PedirPin
        visible={pin}
        titulo="Fue falsa alarma"
        explicacion={avisada ? `Escribe tu PIN y le diremos a ${quienes} que estás bien.` : 'Escribe tu PIN para cancelar la alerta.'}
        alConfirmar={async (p) => {
          const ok = await servicio.cancelarAlerta(p);
          if (ok) onCerrar();
          return ok;
        }}
        alCerrar={() => setPin(false)}
      />
    </Pantalla>
  );
}
