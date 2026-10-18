import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * "¿Todo bien?" como notificación del sistema (components/AvisoDiscreto): aparece aunque estés en otra app.
 * Se ve como una notificación normal, sin rojo ni sirenas (si la tiene el ladrón, no le dice nada).
 * Vibración corta, sin sonido.
 */
const CANAL = 'todo-bien';
let listo = false;

async function preparar(): Promise<void> {
  if (listo || Platform.OS === 'web') return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CANAL, {
      name: '¿Todo bien?',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 120],
      sound: null,
    });
  }
  listo = true;
}

export async function pedirPermisoNotificaciones(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  await preparar();
  const { granted } = await Notifications.requestPermissionsAsync();
  return granted;
}

export async function avisarTodoBien(segundos: number): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    await preparar();
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: '¿Todo bien?',
        body: `Notamos un movimiento brusco y luego velocidad. Si fue tuyo, confírmalo y no avisaremos a nadie. Avisaremos en 0:${String(segundos).padStart(2, '0')}.`,
        sound: false,
        ...(Platform.OS === 'android' ? { channelId: CANAL } : {}),
      },
      trigger: null,
    });
  } catch {
    return null;
  }
}

export async function quitarAviso(id: string | null): Promise<void> {
  if (!id || Platform.OS === 'web') return;
  await Notifications.dismissNotificationAsync(id).catch(() => undefined);
}
