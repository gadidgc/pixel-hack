import { CABECERA_CSV, filaCsv, type Entrada } from '@pixel-hack/detector';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

/** Etiquetas de las grabaciones (ver docs/PLAN.md §4.3). Las que empiezan con "arrebato" deben dar alerta. */
export const ETIQUETAS = [
  'caminar',
  'parado-mirando',
  'caida',
  'lanzar-a-mochila',
  'sacar-del-bolsillo',
  'mototaxi',
  'combi',
  'moto-propia',
  'correr',
  'arrebato-simulado-bici',
  'demo-a-pie',
] as const;
export type Etiqueta = (typeof ETIQUETAS)[number];

/** Máximo 10 minutos a 50 Hz: unas 30 000 filas, ~1,5 MB. */
const MAX_FILAS = 30_000;

/** Guarda en memoria lo que llega de los sensores, en el formato CSV del detector. */
export class Grabadora {
  private filas: string[] = [];
  private inicio = 0;
  etiqueta: Etiqueta = 'caminar';
  grabando = false;

  empezar(etiqueta: Etiqueta): void {
    this.etiqueta = etiqueta;
    this.filas = [];
    this.inicio = Date.now();
    this.grabando = true;
  }

  agregar(e: Entrada): void {
    if (!this.grabando) return;
    if (this.filas.length >= MAX_FILAS) {
      this.grabando = false;
      return;
    }
    this.filas.push(filaCsv(e));
  }

  detener(): void {
    this.grabando = false;
  }

  get cantidad(): number {
    return this.filas.length;
  }

  aTexto(): string {
    const meta = [
      `# etiqueta=${this.etiqueta}`,
      `# plataforma=${Platform.OS} ${String(Platform.Version)}`,
      `# inicio=${new Date(this.inicio).toISOString()}`,
    ];
    return [...meta, CABECERA_CSV, ...this.filas].join('\n') + '\n';
  }

  /** Comparte el CSV (WhatsApp, Drive, correo) o lo descarga en la web. */
  async exportar(): Promise<string> {
    const nombre = `${this.etiqueta}-${new Date(this.inicio).toISOString().replace(/[:.]/g, '-')}.csv`;
    const contenido = this.aTexto();
    if (Platform.OS === 'web') {
      const url = URL.createObjectURL(new Blob([contenido], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = nombre;
      a.click();
      URL.revokeObjectURL(url);
      return nombre;
    }
    const archivo = new File(Paths.cache, nombre);
    if (archivo.exists) archivo.delete();
    archivo.create();
    await archivo.write(contenido);
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(archivo.uri, { mimeType: 'text/csv' });
    return nombre;
  }
}
