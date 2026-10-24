# Bitácora de publicación en las tiendas

Cada avance de [publicacion-tiendas.md](publicacion-tiendas.md), el más nuevo arriba. La escribe el agente
`/publicar-tiendas` al terminar cada sesión, y cualquiera del equipo puede agregar una línea.

**Formato:** `### AAAA-MM-DD · quién` y debajo: qué se hizo, qué falta y si alguien está bloqueado.
No pongas claves, códigos 2FA, correos de testers ni datos personales.

## Estado de un vistazo

| | Android (Google Play) | iPhone (App Store) |
|---|---|---|
| Cuenta de desarrollador | ❌ no existe (falta crear y pagar US$ 25) | ✅ existe (ya hay build en TestFlight) |
| App creada en la consola | ❌ | ✅ (con el nombre anterior, "Alerta Arrebato") |
| Build de tienda | ❌ falta el `.aab` | ✅ build 2 (versión 0.1.0, 18 oct) |
| Política de privacidad publicada | ❌ | ❌ |
| Ficha (textos, capturas, ícono) | ❌ | ❌ |
| Formularios (datos, edad, permisos) | ❌ | ❌ |
| Prueba cerrada / revisión | ❌ | ❌ |
| Publicada | ❌ | ❌ |

## Entradas

### 2026-10-24 · Claude (con Gabriel)
- Nueva fase: publicar en Google Play y App Store. Plan en `publicacion-tiendas.md`.
- Revisado el estado real:
  - EAS (Expo) con sesión iniciada como `gadidgc`. Último build de tienda: iOS 0.1.0 (build 2), 18 oct. No hay build de Android para tienda.
  - Play Console (Chrome, gabrielito.xvr@gmail.com): abre la pantalla de **crear cuenta de desarrollador** → no hay cuenta.
  - App Store Connect: Chrome **sin sesión iniciada**.
- Creado: este registro, la ficha de las tiendas (`apps/movil/tienda/ficha.md`), el borrador de política de privacidad
  (`apps/movil/public/privacidad/`), el envío de Android en `eas.json` y la skill `/publicar-tiendas`.
- **Bloqueado en Gabriel:** (1) crear la cuenta de Google Play (tipo "Yourself", nombre de desarrollador "pixel-hack");
  (2) iniciar sesión en App Store Connect en Chrome.
- Siguiente: publicar la política de privacidad (deploy del Worker), compilar el `.aab`, hacer capturas.
