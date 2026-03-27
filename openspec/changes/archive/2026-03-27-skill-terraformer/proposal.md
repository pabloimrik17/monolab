## Why

No hay forma automatizada de asegurar que un proyecto tenga instaladas las skills de skills.sh relevantes para su stack. Cada sesión empieza sin saber si faltan skills útiles, y tras instalarlas manualmente no hay mecanismo para que persistan entre `pnpm install`.

## What Changes

- Nueva skill `skill-terraformer` en `claude-plugins/experiments/skills/`
- Lista curada embebida en la skill: mapeo stack → skills de skills.sh relevantes
- Detección automática del stack del proyecto (package.json, configs, frameworks)
- Instalación de skills faltantes via `bunx skills add` (project-level)
- Asegurar script `postinstall` en package.json con `bunx skills experimental_install` cuando hay skills gestionadas

## Capabilities

### New Capabilities

- `skill-terraformer`: Skill que al activarse detecta el stack del proyecto, compara contra lista curada de skills.sh, instala las faltantes, y asegura postinstall en package.json

### Modified Capabilities

- `experiments-plugin`: Añade directorio `skills/` con la primera skill del plugin

## Impact

- `claude-plugins/experiments/` — nuevo directorio `skills/skill-terraformer/`
- `claude-plugins/experiments/.claude-plugin/plugin.json` — posible bump de versión
- `package.json` (root) — puede añadirse/modificarse script `postinstall`
- Dependencia externa: `skills` CLI (npx, no instalada como dep)
- Genera `skills-lock.json` en root del proyecto
