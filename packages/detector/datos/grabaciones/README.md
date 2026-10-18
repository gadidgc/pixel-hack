# Grabaciones reales

Aquí van los CSV que exporta el **modo grabar** de la app (ver [docs/PLAN.md §4.5](../../../../docs/PLAN.md)).

- Nombre: lo pone la app (`<etiqueta>-<fecha>.csv`). No agregues nombres de personas.
- La primera línea `# etiqueta=...` dice qué pasó. Las que empiezan con `arrebato` deben dar alerta.
- La ubicación puede revelar dónde vive alguien: no empieces a grabar en tu casa.
- Para probarlas: `npm run reproducir -- packages/detector/datos/grabaciones/*.csv`
