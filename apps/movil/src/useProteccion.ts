import {
  CONFIG_DEMO,
  CONFIG_POR_DEFECTO,
  DetectorArrebato,
  type EventoDetector,
  type LecturaGps,
  type MuestraImu,
  type Telemetria,
} from '@pixel-hack/detector';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useCallback, useEffect, useRef, useState } from 'react';
import { enviar } from './alertas';
import { Grabadora, type Etiqueta } from './grabadora';
import { escucharSensores, pedirPermisoSensores } from './sensores';
import { escucharUbicacion, pedirPermisoUbicacion } from './ubicacion';

const ETIQUETA_PANTALLA = 'proteccion';

export interface Registro {
  id: number;
  t: number;
  texto: string;
  tipo: 'info' | 'aviso' | 'alerta' | 'error';
}

export interface EstadoProteccion {
  activa: boolean;
  modoDemo: boolean;
  telemetria: Telemetria | null;
  tieneGiroscopio: boolean | null;
  tieneGps: boolean | null;
  ultimaAlerta: Extract<EventoDetector, { tipo: 'alerta' }> | null;
  registros: Registro[];
  grabando: boolean;
  filasGrabadas: number;
}

export function describirEvento(e: EventoDetector): string {
  switch (e.tipo) {
    case 'posible_jalon':
      return `Posible jalón: ${e.picoAceleracionG.toFixed(1)} g, giro ${e.picoGiroRadS?.toFixed(1) ?? '—'} rad/s`;
    case 'descartado':
      return `Descartado: ${e.motivo.replace(/_/g, ' ')}`;
    case 'alerta':
      return `ALERTA (${e.via.replace(/_/g, ' ')}, confianza ${e.confianza}) a ${((e.t - e.tJalon) / 1000).toFixed(1)} s del jalón`;
  }
}

/**
 * Conecta sensores + GPS → detector → alertas. Todo lo "inteligente" vive en @pixel-hack/detector;
 * aquí solo hay permisos, suscripciones y estado de pantalla.
 */
export function useProteccion() {
  const [estado, setEstado] = useState<EstadoProteccion>({
    activa: false,
    modoDemo: false,
    telemetria: null,
    tieneGiroscopio: null,
    tieneGps: null,
    ultimaAlerta: null,
    registros: [],
    grabando: false,
    filasGrabadas: 0,
  });
  const detector = useRef(new DetectorArrebato(CONFIG_POR_DEFECTO));
  const grabadora = useRef(new Grabadora());
  const detenerTodo = useRef<Array<() => void>>([]);
  const contador = useRef(0);
  const pantallaPrendida = useRef(false);

  const registrar = useCallback((texto: string, tipo: Registro['tipo'] = 'info') => {
    const r: Registro = { id: ++contador.current, t: Date.now(), texto, tipo };
    setEstado((s) => ({ ...s, registros: [r, ...s.registros].slice(0, 40) }));
  }, []);

  const atenderEventos = useCallback(
    (eventos: EventoDetector[]) => {
      for (const e of eventos) {
        registrar(describirEvento(e), e.tipo === 'alerta' ? 'alerta' : e.tipo === 'posible_jalon' ? 'aviso' : 'info');
        if (e.tipo === 'alerta') setEstado((s) => ({ ...s, ultimaAlerta: e }));
        if (e.tipo === 'posible_jalon' || e.tipo === 'alerta') {
          void enviar({ tipo: e.tipo, evento: e }).then((r) => {
            if (e.tipo === 'alerta') registrar(`Envío de la alerta: ${r.detalle}`, r.enviado ? 'info' : 'aviso');
          });
        }
      }
    },
    [registrar],
  );

  const alImu = useCallback(
    (m: MuestraImu) => {
      grabadora.current.agregar({ tipo: 'imu', muestra: m });
      atenderEventos(detector.current.procesarImu(m));
    },
    [atenderEventos],
  );

  const alGps = useCallback(
    (l: LecturaGps) => {
      grabadora.current.agregar({ tipo: 'gps', lectura: l });
      // Mientras haya un posible jalón o una alerta, mandamos la ruta de huida en vivo.
      if (detector.current.estado !== 'reposo') void enviar({ tipo: 'ubicacion', lectura: l });
      atenderEventos(detector.current.procesarGps(l));
      setEstado((s) => (s.tieneGps ? s : { ...s, tieneGps: true }));
    },
    [atenderEventos],
  );

  const desactivar = useCallback(() => {
    for (const f of detenerTodo.current) f();
    detenerTodo.current = [];
    detector.current.reiniciar();
    if (pantallaPrendida.current) {
      pantallaPrendida.current = false;
      // En algunos navegadores falla si el permiso de pantalla prendida no llegó a activarse.
      Promise.resolve(deactivateKeepAwake(ETIQUETA_PANTALLA)).catch(() => undefined);
    }
    setEstado((s) => ({ ...s, activa: false, telemetria: null }));
  }, []);

  const activar = useCallback(async () => {
    try {
      // Debe llamarse directo desde el toque del botón (requisito de iPhone en la web).
      if (!(await pedirPermisoSensores())) {
        registrar('Sin permiso de movimiento (o este dispositivo no tiene sensores). En la laptop usa "Simular".', 'error');
        return;
      }
      const sensores = await escucharSensores(alImu);
      detenerTodo.current.push(sensores.detener);
      let tieneGps = false;
      if (await pedirPermisoUbicacion()) {
        detenerTodo.current.push(await escucharUbicacion(alGps));
        tieneGps = true;
      } else {
        registrar('Sin permiso de ubicación: solo se usarán los sensores (confianza media).', 'aviso');
      }
      // El celular se queda con la pantalla prendida mientras protege (ver docs/PLAN.md §5).
      pantallaPrendida.current = await activateKeepAwakeAsync(ETIQUETA_PANTALLA).then(
        () => true,
        () => false,
      );
      const reloj = setInterval(() => {
        setEstado((s) => ({ ...s, telemetria: detector.current.obtenerTelemetria(), filasGrabadas: grabadora.current.cantidad }));
      }, 200);
      detenerTodo.current.push(() => clearInterval(reloj));
      setEstado((s) => ({ ...s, activa: true, tieneGiroscopio: sensores.tieneGiroscopio, tieneGps: tieneGps ? s.tieneGps : false }));
      registrar(`Protección activa${sensores.tieneGiroscopio ? '' : ' (sin giroscopio)'}.`);
    } catch (e) {
      desactivar();
      registrar(e instanceof Error ? e.message : 'No se pudo activar la protección.', 'error');
    }
  }, [alImu, alGps, desactivar, registrar]);

  const cancelarAlerta = useCallback(() => {
    const eventos = detector.current.cancelar();
    for (const e of eventos) void enviar({ tipo: 'cancelada', evento: e });
    setEstado((s) => ({ ...s, ultimaAlerta: null }));
    registrar('Falsa alarma: alerta cancelada y avisado.');
  }, [registrar]);

  const cambiarModoDemo = useCallback(
    (modoDemo: boolean) => {
      detector.current = new DetectorArrebato(modoDemo ? CONFIG_DEMO : CONFIG_POR_DEFECTO);
      setEstado((s) => ({ ...s, modoDemo, ultimaAlerta: null }));
      registrar(modoDemo ? 'Modo demo: la huida a pie (corriendo) cuenta.' : 'Modo normal: solo huida en vehículo.');
    },
    [registrar],
  );

  const empezarGrabacion = useCallback((etiqueta: Etiqueta) => {
    grabadora.current.empezar(etiqueta);
    setEstado((s) => ({ ...s, grabando: true, filasGrabadas: 0 }));
  }, []);

  const detenerGrabacion = useCallback(async () => {
    grabadora.current.detener();
    setEstado((s) => ({ ...s, grabando: false, filasGrabadas: grabadora.current.cantidad }));
    try {
      const nombre = await grabadora.current.exportar();
      registrar(`Grabación guardada: ${nombre}`);
    } catch (e) {
      registrar(`No se pudo exportar: ${e instanceof Error ? e.message : 'error'}`, 'error');
    }
  }, [registrar]);

  useEffect(() => desactivar, [desactivar]);

  return { estado, activar, desactivar, cancelarAlerta, cambiarModoDemo, empezarGrabacion, detenerGrabacion, registrar };
}
