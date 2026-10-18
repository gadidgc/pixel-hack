import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { Boton, Rotulo, T, hora } from '../ui/componentes';
import { Icono } from '../ui/iconos';
import { RADIO, useTema } from '../ui/tema';

/**
 * Kit de bloqueo (página del contacto, tras confirmar el robo). La app NO bloquea nada: los bancos y las
 * operadoras verifican al titular por teléfono. Aquí van las llamadas en orden, con el número escrito (en
 * algunas vistas `tel:` no abre el marcador) y los datos que van a pedir. Lo arma el backend
 * (apps/api/src/bloqueo.ts), con números fijos revisados: nunca se buscan en internet durante un robo.
 */
export interface PasoKit {
  paso: string;
  titulo: string;
  detalle: string;
  telefono: string | null;
  enlace: string | null;
  piden: string[];
  hecho: boolean;
  quien: string | null;
  hechoEn: number | null;
}

export interface Kit {
  pasos: PasoKit[];
  /** `null`: pasaron 24 h y el backend borró los datos de la dueña (privacidad). */
  datos: { linea: string | null; imei: string | null; dni: string | null } | null;
}

/** Datos de ejemplo, SOLO para la vista `/a/ejemplo` (se marca en pantalla). */
export const EJEMPLO_KIT: Kit = {
  pasos: [
    {
      paso: 'bancos',
      titulo: 'Bloquear Yape y BCP',
      detalle: 'Una llamada al 1820 (24 h) te conecta con el área de bloqueo de cada banco. Di el nombre del banco o "Yape" y pide bloquear las tarjetas y cuentas de Ana.',
      telefono: '1820',
      enlace: null,
      piden: ['dni'],
      hecho: true,
      quien: 'Rosa',
      hechoEn: null,
    },
    {
      paso: 'operador',
      titulo: 'Suspender la línea y el celular (Claro)',
      detalle: 'Pide la suspensión de la línea por robo y el bloqueo del IMEI.',
      telefono: '0800 00123',
      enlace: null,
      piden: ['linea', 'dni', 'imei'],
      hecho: false,
      quien: null,
      hechoEn: null,
    },
    {
      paso: 'denuncia',
      titulo: 'Hacer la denuncia policial',
      detalle: 'La denuncia digital de la PNP acepta el robo de celulares, las 24 horas. Ten a mano la hora y el lugar del jalón.',
      telefono: null,
      enlace: 'https://sistemas.policia.gob.pe/denuncias_digitales/',
      piden: ['dni', 'hora', 'lugar'],
      hecho: false,
      quien: null,
      hechoEn: null,
    },
    {
      paso: 'verificar_imei',
      titulo: 'Confirmar que el celular quedó bloqueado',
      detalle: 'En "Checa tu IMEI" de OSIPTEL. Si a las 24 h no aparece como robado, vuelve a llamar a la operadora.',
      telefono: null,
      enlace: 'https://checatuimei.osiptel.gob.pe',
      piden: ['imei'],
      hecho: false,
      quien: null,
      hechoEn: null,
    },
  ],
  datos: { linea: '987654321', imei: '351234567890123', dni: null },
};

function separar(linea: string): string {
  return linea.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
}

/** 351234567890123 → 35 123456 789012 3 (como viene impreso en la caja): más fácil de dictar. */
function separarImei(imei: string): string {
  return imei.length === 15 ? `${imei.slice(0, 2)} ${imei.slice(2, 8)} ${imei.slice(8, 14)} ${imei.slice(14)}` : imei;
}

/** Cuánto manda una marca propia sobre lo que dice el backend, mientras este se pone al día (lee cada 2 s). */
const MARCA_PROPIA_MS = 6000;

/** Resultado de marcar un paso: `error` con el motivo para mostrar, o `quien` (el nombre con que te ve la red). */
export type ResultadoMarca = { error: string; quien?: undefined } | { error: null; quien: string };

interface Props {
  kit: Kit;
  nombre: string;
  horaJalon: string;
  /** Marca o desmarca un paso para toda la red. */
  onMarcar: (paso: string, hecho: boolean) => Promise<ResultadoMarca>;
}

export function KitBloqueo({ kit, nombre, horaJalon, onMarcar }: Props) {
  const c = useTema();
  // Lo que acaba de marcar esta persona. Solo manda unos segundos: después, la verdad es lo que dice el
  // backend (así, si otro familiar desmarca un paso, aquí también se ve).
  const [propias, setPropias] = useState<Record<string, { valor: boolean; desde: number }>>({});
  // Con qué nombre ve la red a esta persona (lo devuelve el backend al marcar), para decir "Hecho por ti".
  const [yo, setYo] = useState<string | null>(null);
  const [error, setError] = useState('');
  const propiaVigente = (p: PasoKit) => {
    const propia = propias[p.paso];
    return propia && propia.valor !== p.hecho && Date.now() - propia.desde < MARCA_PROPIA_MS ? propia : null;
  };
  const hecho = (p: PasoKit) => propiaVigente(p)?.valor ?? p.hecho;
  const cuantos = kit.pasos.filter(hecho).length;
  const siguiente = kit.pasos.find((p) => !hecho(p))?.paso;

  const marcar = async (p: PasoKit) => {
    const nuevo = !hecho(p);
    const desde = Date.now();
    setPropias((x) => ({ ...x, [p.paso]: { valor: nuevo, desde } }));
    const r = await onMarcar(p.paso, nuevo);
    setError(r.error ?? '');
    if (r.error === null) setYo(r.quien);
    // Si falló, volvemos a lo que dice el backend (solo si no hubo otro toque después).
    else setPropias((x) => (x[p.paso]?.desde === desde ? { ...x, [p.paso]: { valor: !nuevo, desde } } : x));
  };

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <Rotulo>PASOS PARA BLOQUEAR, UNO POR UNO</Rotulo>
        <T v="hora" suave>
          {cuantos} de {kit.pasos.length}
        </T>
      </View>

      <DatosParaDictar datos={kit.datos} nombre={nombre} horaJalon={horaJalon} />

      {kit.pasos.map((p) => {
        const listo = hecho(p);
        const actual = p.paso === siguiente;
        // "ti" mientras tu marca no llega al backend, o cuando el backend dice que la última la hiciste tú.
        const mia = Boolean(propiaVigente(p)) || (p.quien !== null && p.quien === yo);
        const quien = listo ? (mia ? 'ti' : p.quien) : null;
        return (
          <View key={p.paso} style={{ borderRadius: RADIO.s, backgroundColor: actual ? c.avisoFondo : c.superficie2, padding: 12, gap: 8 }}>
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
              <View style={{ flex: 1, paddingTop: 2 }}>
                <T v="cuerpo15Fuerte" style={{ textDecorationLine: listo ? 'line-through' : 'none' }} color={listo ? c.textoSuave : c.texto}>
                  {p.titulo}
                </T>
                <T v="apoyo" suave>
                  {listo ? `Hecho${quien ? ` por ${quien}` : ''}${p.hechoEn && !propiaVigente(p) ? ` · ${hora(p.hechoEn)}` : ''}` : 'Pendiente'}
                </T>
              </View>
              {/* El check va aparte (48 px): tocar el título por error no marca nada para toda la red. */}
              <Pressable
                onPress={() => void marcar(p)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: listo }}
                accessibilityLabel={listo ? `Deshacer: ${p.titulo}` : `Marcar como hecho: ${p.titulo}`}
                style={{ minWidth: 48, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, borderRadius: RADIO.total }}
              >
                <View
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: RADIO.total,
                    borderWidth: listo ? 0 : 2,
                    borderColor: c.textoSuave,
                    backgroundColor: listo ? c.protegido : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {listo && <Icono nombre="check" tam={14} color={c.sobreProtegido} grosor={2.6} />}
                </View>
                <T v="apoyo" suave>
                  {listo ? 'Deshacer' : 'Ya lo hice'}
                </T>
              </Pressable>
            </View>
            {/* Los detalles siguen a la vista (atenuados) aunque el paso esté hecho: por si hay que volver a llamar. */}
            <View style={{ gap: 8, opacity: listo ? 0.6 : 1 }}>
              {!listo && (
                <T v="apoyo" suave>
                  {p.detalle}
                </T>
              )}
              {p.telefono && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <T v="dato20" style={{ flex: 1 }} selectable>
                    {p.telefono}
                  </T>
                  <Boton texto="Llamar" icono="telefono" variante="secundario" principal={false} onPress={() => void Linking.openURL(`tel:${p.telefono!.replace(/[^\d+]/g, '')}`)} accessibilityLabel={`Llamar al ${p.telefono}`} />
                </View>
              )}
              {p.enlace && <Boton texto="Abrir la página" icono="flecha" variante="secundario" principal={false} onPress={() => void Linking.openURL(p.enlace!)} />}
            </View>
          </View>
        );
      })}

      {!!error && (
        <T v="apoyo" color={c.alerta}>
          {error}
        </T>
      )}
      <T v="apoyo" suave>
        Si el banco solo atiende a {nombre}, pásale estos datos para que llame cuando pueda. Nadie de Vigía te va a pedir claves ni códigos.
      </T>
    </View>
  );
}

/** Lo que van a pedir en las llamadas. Va ARRIBA de los pasos: se lee mientras se habla por teléfono. */
function DatosParaDictar({ datos, nombre, horaJalon }: { datos: Kit['datos']; nombre: string; horaJalon: string }) {
  const c = useTema();
  return (
    <View style={{ borderRadius: RADIO.s, backgroundColor: c.superficie2, padding: 12, gap: 4 }}>
      <Rotulo>TE VAN A PEDIR</Rotulo>
      {datos ? (
        <>
          <Dato etiqueta="Línea" valor={datos.linea ? separar(datos.linea) : null} falta={`Pregúntale a la familia el número de ${nombre}`} />
          <Dato etiqueta="IMEI" valor={datos.imei ? separarImei(datos.imei) : null} falta={`${nombre} no lo guardó; la operadora lo busca con la línea`} />
          <Dato etiqueta="DNI" valor={datos.dni} falta={`${nombre} no lo guardó; pregúntaselo a la familia`} />
        </>
      ) : (
        <T v="apoyo" suave>
          Por privacidad, la línea, el IMEI y el DNI de {nombre} se borraron a las 24 horas. Pídeselos a la familia.
        </T>
      )}
      <Dato etiqueta="Hora del jalón" valor={horaJalon} falta="" />
    </View>
  );
}

function Dato({ etiqueta, valor, falta }: { etiqueta: string; valor: string | null; falta: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'baseline' }}>
      <T v="apoyo" suave>
        {etiqueta}
      </T>
      {valor ? (
        <T v="dato" selectable>
          {valor}
        </T>
      ) : (
        <T v="apoyo" suave style={{ flex: 1 }}>
          {falta}
        </T>
      )}
    </View>
  );
}
