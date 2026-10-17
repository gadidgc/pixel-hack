# pixel-hack · Hack the Andes 2026 · Track: Seguridad

Lima, 17 y 18 de octubre de 2026 · 30 h · Enfoque Perú / Latinoamérica.

## Estructura
- [CONTEXT.md](CONTEXT.md): **contexto compartido**. Rúbrica, reglas, herramientas, cifras de seguridad en el Perú, personas a entrevistar. Todos lo leen primero.
- [SYNTHESIS.md](SYNTHESIS.md): **tablero** que Claude reconstruye a partir de las carpetas de todos (puntaje proyectado del jurado por idea).
- [CLAUDE.md](CLAUDE.md): instrucciones que el Claude de cualquier integrante sigue automáticamente.
- `members/`: una carpeta por integrante: [gabriel](members/gabriel), [cesar](members/cesar), [mauricio](members/mauricio), [piero](members/piero).

## Cómo trabajamos (fase 1: lluvia de ideas)
1. Lean [CONTEXT.md](CONTEXT.md) (10 min).
2. **Suban lo que sea** a su carpeta `members/<tu-nombre>/`: ideas, links, capturas, notas de entrevistas. No hace falta ningún formato.
3. Súbelo con un **Pull Request** (nadie hace push directo a `main`):
   ```bash
   git checkout main && git pull
   git checkout -b <tu-nombre>/<tema>      # ej: cesar/ideas-bodega
   git add . && git commit -m "Ideas de bodega"
   git push -u origin <tu-nombre>/<tema>
   ```
   Luego abre el PR en GitHub (botón "Compare & pull request") y **pide a otro integrante que lo apruebe** antes del merge. O simplemente pídele a tu Claude: "sube mis cambios en un PR".
4. Díganle a Claude **"sintetiza"**. Lee todas las carpetas y reconstruye [SYNTHESIS.md](SYNTHESIS.md): cada idea con su puntaje según la fórmula del jurado, la evidencia que la respalda, lo que falta y quién hace qué después.
5. Repetir. Elegimos una idea cuando el tablero muestre evidencia real detrás de una ganadora.

Cada uno puede usar su propio Claude Code en este repo. Lee [CLAUDE.md](CLAUDE.md) automáticamente, así todos comparten el mismo contexto y el mismo proceso.

## Reglas del repo
- **Todo cambio entra por Pull Request** y lo aprueba otro integrante. Nadie hace push directo a `main`.
- Todo en español.

## Nunca suban
Claves, API keys, códigos de créditos ni datos personales de nadie.
