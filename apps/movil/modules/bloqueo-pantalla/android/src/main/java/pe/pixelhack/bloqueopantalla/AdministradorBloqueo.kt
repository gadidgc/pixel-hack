package pe.pixelhack.bloqueopantalla
import android.app.admin.DeviceAdminReceiver
/** Solo force-lock. Revocar la autorización no bloquea ni borra el teléfono. */
class AdministradorBloqueo : DeviceAdminReceiver()
