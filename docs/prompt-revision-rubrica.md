# Prompt: revisión del repo según la rúbrica

Prompt para pedirle a Claude (u otro agente) que revise el repositorio completo antes de la entrega:
que no tenga bugs y que cumpla cada criterio de la [rúbrica oficial](rubrica-oficial.pdf).
Cópialo tal cual en una sesión nueva.

```text
Contexto: los jurados de Hack the Andes revisan el repo con agentes de IA y les pasan la rúbrica
oficial (docs/rubrica-oficial.pdf). Queremos mejorar el repositorio para que cumpla TODA la
rúbrica, criterio por criterio, y que no tenga bugs.

Regla principal: no agregues funcionalidades nuevas ni toques los umbrales del detector. Sí puedes
corregir bugs, ordenar el código y mejorar la documentación.

PARTE 1 · Revisión técnica: que no tenga bugs
1. Corre npm install, npm test y npm run typecheck. Todo tiene que pasar.
2. Revisa a fondo el código de packages/detector, apps/movil (incluidos modules/) y apps/api, y
   busca bugs reales:
   - errores de lógica, casos borde sin manejar y estados que se quedan colgados;
   - promesas sin manejar, temporizadores que no se limpian y fugas de suscripciones;
   - datos que pueden llegar vacíos o inválidos, errores de red y permisos negados;
   - textos o flujos rotos en las pantallas;
   - seguridad: claves en el repo, validación de entradas en la API y datos personales expuestos.
3. Por cada bug: explica qué falla, en qué archivo y línea, y cómo se reproduce. Corrígelo con el
   cambio más pequeño posible y agrega una prueba que lo cubra.
4. Si un arreglo cambia el comportamiento de la app o es grande, pregúntame antes de hacerlo.
5. Verifica también que la URL pública responda: /, /api/salud, /a/ejemplo y la descarga del APK.

PARTE 2 · Cumplir la rúbrica, criterio por criterio
Para cada criterio, compara lo que pide la rúbrica con lo que hay en el repo y mejora lo que falte.

- Requisitos (Paso 0): que el README muestre arriba la URL pública y el enlace al repo.

- Complejidad técnica (30%). La rúbrica pide "datos reales, modelos o servicios orquestados,
  arquitectura no trivial". En el README, con evidencia del repo:
  - por qué usamos reglas (máquina de estados con umbrales) y no aprendizaje automático: no hay
    datos públicos de arrebatos desde moto, y las reglas se pueden auditar;
  - qué fue difícil y cómo lo resolvimos: fusión de sensores, filtro de gravedad, sensores en
    segundo plano con módulos nativos, bloqueo de Android, backend en Cloudflare con WhatsApp y
    SMS, y ruta en vivo;
  - la validación con datos reales (SHL y SPU, con sus números), el simulador y la auditoría;
  - un diagrama de la arquitectura en mermaid.

- Funciona (25%). La rúbrica pide que el flujo completo corra desde la URL pública, con datos
  reales. En el README, una sección "Pruébalo" con lo que ya existe: la URL, /a/ejemplo, la
  descarga del APK y el modo demo. La lista de "falta probar" tiene que estar al día con el
  código. No describas la demo con el número de un jurado.

- Calidad técnica (20%). La rúbrica pide código sólido, que maneje errores, casos borde y
  credenciales. Es la Parte 1. Además:
  - que las pruebas automáticas estén explicadas en el README (cuántas, de qué partes y cómo
    correrlas);
  - que no haya código muerto, archivos sueltos ni documentos contradictorios;
  - si conviene un CI que corra todas las pruebas, propónmelo antes de hacerlo.

- Problema e impacto (15%). La rúbrica pide un usuario específico y evidencia del problema. Una
  sección corta "El problema" al inicio del README, solo con evidencia que ya está en el repo (por
  ejemplo, la cifra de RENTESEG/OSIPTEL de docs/funcionalidades-app.md, con su fuente). No
  inventes entrevistas.

- Claridad (10%). La rúbrica pide explicar qué hicieron, por qué y qué quedó fuera:
  - un README sencillo, que el jurado entienda en 2 minutos, con el detalle largo en docs/;
  - "Lo que ya funciona" separado de "Ideas pendientes";
  - una sección "Decisiones y tradeoffs";
  - una sección "Sponsors que usamos", solo con lo que de verdad usamos.

- Bonus por tracción: no inventes usuarios. Si no hay evidencia real de gente de fuera del
  equipo, no pongas nada.

Fuera de alcance: funcionalidades nuevas, cambios de umbrales, entrevistas y la demo con el número
de un jurado.

PARTE 3 · Entrega
- Todo en español, claro y sencillo. No inventes evidencia ni cifras.
- Rama propia (claude/<tema>) y PR hacia main. Antes del PR: npm test y npm run typecheck pasan.
- Al final, dame una tabla con cada criterio de la rúbrica: cómo estaba, qué cambiaste y la nota
  que esperas; y la lista de bugs encontrados y corregidos.
```
