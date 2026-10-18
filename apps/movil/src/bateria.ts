import * as IntentLauncher from 'expo-intent-launcher';
import { Platform } from 'react-native';
import SensoresFondo from '../modules/sensores-fondo';

/**
 * Batería y "asesinos de apps" de Android (Xiaomi, Samsung, Huawei, Motorola: los más vendidos en Perú).
 *
 * El servicio en primer plano de la ubicación mantiene viva la app, pero:
 * - Doze (Android 6+) ignora el wake lock y atrasa la entrega del GPS si la app sigue "optimizada".
 *   Google Play acepta pedir la excepción directa a las apps de seguridad personal:
 *   https://developer.android.com/training/monitoring-device-state/doze-standby#exemption-cases
 * - Las capas de Xiaomi/Huawei cierran apps en segundo plano aunque tengan notificación fija. Ahí la
 *   persona tiene que activar a mano "Inicio automático" y "Sin restricciones" (https://dontkillmyapp.com).
 *
 * En iPhone y en la web nada de esto aplica.
 */

const PAQUETE = 'pe.pixelhack.alertaarrebato';

/** `true`: ya sin optimización · `false`: falta · `null`: no aplica (iPhone, web o Expo Go). */
export function sinOptimizacionBateria(): boolean | null {
  if (Platform.OS !== 'android' || !SensoresFondo) return null;
  try {
    return SensoresFondo.sinOptimizacionBateria();
  } catch {
    return null;
  }
}

/**
 * Muestra el diálogo del sistema "¿Permitir que Vigía se ejecute en segundo plano?".
 * Si el celular no lo tiene, abre la lista de "Optimización de batería" para que la persona la busque.
 */
export async function pedirSinOptimizacionBateria(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, {
      data: `package:${PAQUETE}`,
    });
  } catch {
    await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
  }
}

/** Pantallas propias de cada marca para "Inicio automático" / "Apps protegidas" (pueden no existir). */
const AJUSTES_POR_MARCA: Record<string, Array<{ packageName: string; className: string }>> = {
  xiaomi: [{ packageName: 'com.miui.securitycenter', className: 'com.miui.permcenter.autostart.AutoStartManagementActivity' }],
  redmi: [{ packageName: 'com.miui.securitycenter', className: 'com.miui.permcenter.autostart.AutoStartManagementActivity' }],
  poco: [{ packageName: 'com.miui.securitycenter', className: 'com.miui.permcenter.autostart.AutoStartManagementActivity' }],
  huawei: [
    { packageName: 'com.huawei.systemmanager', className: 'com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity' },
    { packageName: 'com.huawei.systemmanager', className: 'com.huawei.systemmanager.optimize.process.ProtectActivity' },
  ],
  honor: [{ packageName: 'com.huawei.systemmanager', className: 'com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity' }],
  oppo: [{ packageName: 'com.coloros.safecenter', className: 'com.coloros.safecenter.permission.startup.StartupAppListActivity' }],
  vivo: [{ packageName: 'com.vivo.permissionmanager', className: 'com.vivo.permissionmanager.activity.BgStartUpManagerActivity' }],
};

export function marcaDelCelular(): string {
  const constantes = Platform.constants as { Manufacturer?: string; Brand?: string };
  return (constantes.Manufacturer ?? constantes.Brand ?? '').toLowerCase();
}

/**
 * Abre el ajuste de "Inicio automático" de la marca si lo conocemos; si no, los datos de la app
 * (ahí están "Batería → Sin restricciones" en Samsung y Motorola).
 */
export async function abrirAjustesDeFondo(): Promise<void> {
  if (Platform.OS !== 'android') return;
  for (const destino of AJUSTES_POR_MARCA[marcaDelCelular()] ?? []) {
    try {
      await IntentLauncher.startActivityAsync('android.intent.action.MAIN', destino);
      return;
    } catch {
      // Esa pantalla no existe en esta versión: probamos la siguiente.
    }
  }
  await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.APPLICATION_DETAILS_SETTINGS, {
    data: `package:${PAQUETE}`,
  });
}
