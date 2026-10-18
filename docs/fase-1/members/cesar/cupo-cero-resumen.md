# Cupo Cero: resumen de la idea aterrizada

Propuesta de Cesar (17 de octubre de 2026), trabajada con Claude a partir de [cupo-cero-ideas.md](cupo-cero-ideas.md).
Es un borrador para que el equipo lo revise. **Todavía no hay entrevistas**: todo lo que diga "usaría" o "le serviría" es hipótesis.

---

## 1. La idea en una frase

**El Waze de los ataques en tu ruta: avisos confirmados por otros choferes, al toque. Y cada aviso, sin que nadie llene nada, va armando el caso contra la banda.**

## 2. Qué cambió frente a la primera versión

| Antes | Ahora | Por qué |
|---|---|---|
| Una víctima sola genera su expediente para la policía | Un **grupo** (empresa de transporte, gremio) se cuida junto | La gente no confía en la policía y denunciar solo te pone en la mira |
| El producto era "registrar la denuncia" | El producto son **avisos útiles hoy**; los registros salen solos | Nadie instala una app para llenar registros |
| La autoridad era el centro | La autoridad es un **destino opcional** que el grupo elige | Sin depender de que un solo policía o fiscal haga su trabajo |
| Muchos módulos (OSINT de links, voz, mapa de calor, Doña Rosa…) | Solo lo que responde a una necesidad concreta | Que la idea no se diluya |

## 3. El problema

- La extorsión mata y paraliza: unas 70 denuncias al día (Ministerio Público, 2026) y más de 80 choferes asesinados en Lima y Callao en 2026 (La República).
- Denunciar no sirve y da miedo: alrededor de **1 condena por cada 76 denuncias** (RPP con datos del Poder Judicial) y riesgo de represalia si la denuncia se filtra.
- Cada uno se defiende por su lado (guachimán, cámaras, grupos de WhatsApp, pagar), pero la banda extorsiona a muchos a la vez.
- Solo 27 de 83 empresas de transporte extorsionadas denunciaron antes de sufrir un atentado (Observatorio del Ministerio Público).

## 4. Para quién

- **Usuario principal: empresas de transporte** (central o patio, choferes, rutas). Es donde más gente muere y ya están organizadas en empresas y gremios.
- **Después:** asociaciones de comerciantes y mercados, orquestas y productoras de eventos. Mismo producto, otro grupo.
- **Juntas vecinales:** canal secundario. Hay miles, pero solo el 2,1 % de los hogares urbanos participa en organizaciones vecinales de seguridad (INEI, 2021), y la PNP las registra (Ley 32487), así que no son un canal independiente.

## 5. Qué hace (explicado a un chofer)

> "Cuando pasa algo en tu ruta (balean un bus, ven a los de la moto rondando un paradero), te llega un aviso al toque: qué pasó, dónde y hace cuánto. Solo de tu ruta y confirmado por otros choferes, no un rumor. Si te pasa algo, aprietas un botón y tu central y tus compañeros saben dónde estás. Y si a tu empresa le llega una amenaza, el dueño ve si esa banda ya atacó a otras empresas de la ruta."

**La app no para una bala.** Ayuda a enterarse antes, decidir mejor y no estar solo. Por eso en el pitch decimos "cuidarse juntos", no "protegerte".

### Lo que se usa todos los días (el gancho)
1. **Avisos confirmados de tu ruta.** Le gana al grupo de WhatsApp: confirmados por varios choferes, solo tu ruta, con lugar y hora, sin rumores.
2. **Botón de pánico.** Un toque: la central, los buses cercanos y la familia ven dónde estás (ubicación compartida por el propio chofer).

### Lo que sale solo de esos avisos (por detrás)
3. **Evidencia sellada.** Cada aviso, captura, audio, llamada o video queda con huella digital (SHA-256) y fecha, guardado por el grupo. Nadie lo puede "perder" ni archivar.
4. **Escalada.** Mensaje → foto del bus → disparos → atentado. La central ve en qué etapa está y puede cambiar turnos o rutas antes del ataque.
5. **Unir casos entre empresas.** Por cuenta de cobro (Yape, Plin, CCI), número, placa (leída del video de las cámaras) y texto del mensaje. "Esta banda escribió a 4 empresas de tu ruta; 2 sufrieron disparos."
6. **Contador de impunidad** para el gremio y la prensa, sin nombres de víctimas: "Esta banda: 14 empresas, 3 atentados, 0 detenidos". En el Perú el Estado se mueve por presión, no por denuncias sueltas.

### Formas de registrar una amenaza
- Captura o audio de WhatsApp.
- **Llamada en vivo:** en altavoz, se transcribe y se sacan cuenta, número, monto, plazo y nombre de la banda. (Idea tomada del "Ángel de la llamada" de Gabriel.)
- **Video de las cámaras** del patio o del bus: motos o personas que se quedan frente al local, placas.

## 6. Quién ve qué

| Rol | Ve | No ve |
|---|---|---|
| Público | Nada, salvo el contador de impunidad (bandas como patrón) | Víctimas, empresas, casos |
| Chofer | Avisos de su ruta y su propio reporte | Quién reportó cada aviso |
| Central de la empresa | El detalle de **su** empresa: amenazas, escalada, evidencia | Datos de otras empresas |
| Gremio | Cifras entre empresas, solo desde 3 casos (para que no se adivine quién es) | Nombres, evidencia, cuentas |
| Autoridad | Solo lo que el grupo decide enviar | Todo lo demás |

## 7. ¿Y la policía?

Sigue en la idea, pero **el grupo tiene el control**:
- Solo la autoridad puede detener, congelar una cuenta (UIF, Ley 32209), dar de baja una línea o pedir datos con orden judicial. La app no la reemplaza.
- Cuando actúa, recibe todo listo. Cuando no actúa, queda constancia y el gremio tiene datos para presionar.
- El expediente puede ir **a la vez** a la División de Extorsiones y a la Fiscalía, para que nadie lo encajone solo.

## 8. Cómo se cuida a quien reporta (miedo a la represalia)

1. La app sirve **aunque nunca denuncies**. Nunca envía nada sola.
2. **Denuncia el grupo, no la persona**: el gremio en nombre de varias empresas a la vez.
3. Solo se envía cuando la banda tiene 3 o más casos, y no en el momento en que tú reportas.
4. El expediente habla de la banda (cuentas, números, placas, textos), no de las víctimas.
5. La app avisa que existe la **reserva de identidad** (Código Procesal Penal, arts. 247 y siguientes) y el programa de protección de víctimas y testigos del Ministerio Público. *Confirmar con un abogado cómo funciona en la práctica.*
6. Golpear el dinero: si se congela una cuenta donde pagaron 14 empresas, la banda no sabe quién fue.
7. Nada sensible queda en el celular, por si el extorsionador lo revisa.

## 9. Líneas rojas

- Nada de reconocimiento facial ni de buscar a la persona (titular, redes, dirección).
- No publicar placas, números ni cuentas con nombre: pueden ser cuentas mula o chips robados.
- No contactar a extorsionadores.
- Nada de justicia por mano propia: la app no organiza persecuciones.
- Un aviso de ruta solo se muestra como "confirmado" con varios reportes independientes (contra rumores y avisos falsos).

## 10. Módulo ligero aparte: Las Tías (idea de Gabriel)

Abuelitas IA que contestan a **estafadores** (nunca a extorsionadores), les hacen perder el tiempo y les sacan sus cuentas, que alimentan el mismo radar de números y cuentas. Tiene su propia puerta y no se mezcla con el flujo de extorsión.
Pitch: *"Contra la extorsión nos cuidamos juntos; a los estafadores los cazamos."*

## 11. Datos para la demo

- **Distrito simulado con bandas escondidas:** empresas, rutas, amenazas y ataques generados a partir de unas 8 bandas inventadas (cuentas, chips, motos, guion, zona). El motor las redescubre y mostramos el porcentaje de acierto. Nombres de banda inventados, nunca bandas reales.
- **Video grabado por el equipo:** una moto con placa de cartón frente a un local, con permiso de quienes aparecen.
- **Cifras reales** del Ministerio Público y del SIDPOL (datos abiertos) para el contexto.

## 12. Lo que falta validar (entrevistas)

- **Chofer o cobrador:** ¿Cómo te enteras hoy de un ataque en tu ruta? ¿Qué grupo de WhatsApp usas y qué le falta? ¿Usarías un botón de pánico?
- **Dueño de empresa de transporte:** ¿Qué hacen cuando llega una amenaza? ¿Se avisan entre empresas? ¿Denunciarían si lo hiciera el gremio por todos y su nombre no apareciera?
- **Dirigente de gremio:** ¿Les serviría el contador de impunidad para presionar?

Si los choferes dicen que el grupo de WhatsApp ya les basta, el gancho de los avisos se cae y hay que repensar.

## 13. Decisiones abiertas para el equipo

- ¿Vamos con Cupo Cero, con NEXUS Rescate (Piero), con Las Tías (Gabriel) o con las ideas de Mauricio?
- Si es Cupo Cero: ¿transporte o comerciantes como primer usuario?
- ¿Quién consigue hoy la entrevista con un chofer o una empresa de transporte?
