## Context

monolab tiene 17 skills project-level (openspec + nx), todas gestionadas manualmente. No hay skills de skills.sh instaladas (no existe `skills-lock.json`). El plugin `experiments` (v0.2.1) tiene 2 commands pero 0 skills — esta será la primera.

El CLI de skills.sh (`skills@1.4.5`) soporta: `add`, `remove`, `list --json`, `check`, `update`, `experimental_install` (restaurar desde lock file). Instalación via `npx`/`bunx`, sin dep local.

## Goals / Non-Goals

**Goals:**
- Skill que detecta stack del proyecto y propone/instala skills de skills.sh relevantes
- Mantener lista curada de mapeos stack→skills embebida en la skill
- Asegurar `postinstall` script para persistencia entre installs
- Project-level scope para todas las instalaciones

**Non-Goals:**
- Skills globales (`-g`) — fuera de scope
- Detección de duplicados con plugins de Claude Code — el usuario gestiona esto
- Fichero de config externo (`.skills-terraform.yml`) — la lista vive en la skill
- Instalación automática sin confirmación — la skill propone, Claude confirma

## Decisions

### D1: Skill, no Hook ni Command

La skill se activa automáticamente via "using-superpowers" al inicio de sesión. Un hook no puede pedir confirmación interactiva. Un command requiere invocación manual.

**Alternativas descartadas:**
- SessionStart hook: no interactivo, bloquea inicio
- Command (`/experiments:skill-terraformer`): requiere que el usuario recuerde invocarlo

### D2: Lista curada embebida en SKILL.md

El mapeo detector→skills vive directamente en el markdown de la skill. Lista curada inicial:

| Condición | Repo | Skill |
|-----------|------|-------|
| `react` en dependencies/devDependencies | `vercel-labs/agent-skills` | `vercel-react-best-practices` |
| `react` en dependencies/devDependencies | `vercel-labs/agent-skills` | `vercel-composition-patterns` |
| `react` en dependencies/devDependencies + `components.json` | `shadcn/ui` | `shadcn` |
| `next` en dependencies/devDependencies | `vercel-labs/next-skills` | `next-best-practices` |
| frontend (universal) | `vercel-labs/agent-skills` | `web-design-guidelines` |
| frontend (universal) | `anthropics/skills` | `frontend-design` |

Plantilla: `bunx skills add <Repo> --skill <Skill> --agent claude-code -y`
Batch por repo con múltiples `--skill` flags.

**Alternativa descartada:** Fichero de config separado — añade complejidad sin beneficio para un solo proyecto.

### D3: `experimental_install` en postinstall

El script postinstall usa `bunx skills experimental_install`, que restaura skills desde `skills-lock.json`. Ambos comandos (`update` y `experimental_install`) requieren el lock file — sin él no hacen nada. Por eso el lock file **debe commitearse** para que funcione en clones frescos.

`experimental_install` es preferible a `update` porque restaura las versiones exactas del lock file en lugar de actualizar a latest.

**Formato del postinstall (con graceful degradation):**
```json
"postinstall": "[ -f skills-lock.json ] && bunx skills experimental_install || true"
```

Solo ejecuta si existe lock file. Si falla, no bloquea `pnpm install`.

Si ya existe un postinstall, se encadena con `&&` aislando el fallback:
`<postinstall-existente> && ( [ -f skills-lock.json ] && bunx skills experimental_install || true )`.
Los paréntesis limitan el `|| true` a la parte de skills, sin enmascarar fallos del postinstall original.

### D4: Flujo de la skill

```
1. Leer project indicators (package.json, nx.json, configs)
2. Evaluar reglas curadas → lista de skills aplicables
3. bunx skills list --json → skills ya instaladas
   (Si falla: reportar error, pedir confirmación al usuario antes de continuar)
4. Diff: aplicables - instaladas = pendientes
5. Para cada pendiente: bunx skills add <repo> --skill <name> --agent claude-code -y
6. Si se instaló ≥1 skill (ahora o antes): verificar postinstall en package.json
7. Si falta postinstall: proponer añadirlo
```

### D5: Agente target `claude-code`

Todas las skills se instalan con `--agent claude-code` ya que es el único agente en uso en monolab.

## Risks / Trade-offs

- **[Lentitud al inicio]** → `bunx skills list --json` y detección de stack son rápidos. Solo se ejecuta `skills add` si hay pendientes.
- **[CLI cambia experimental_install]** → Es experimental. Mitigación: si falla, advertir al usuario para instalación manual desde lock file en lugar de degradar silenciosamente a `skills update` (que no restaura desde lock file).
- **[Lista curada se desactualiza]** → Aceptable: actualizar la skill es trivial. Mejor que over-engineering un sistema de config.
- **[skills-lock.json en git]** → Debe commitearse para que `experimental_install` funcione en clones frescos. Similar a lock files de paquetes.
