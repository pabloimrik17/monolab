## Context

El plugin `experiments` (`claude-plugins/experiments`) aloja skills y comandos beta para el marketplace monolab. Hoy tiene `/experiments:npm-changelog` (fetch + cache de changelogs) como referencia del patrón "comando Claude-readable + invocación bash + cache local". El monorepo monolab usa pnpm workspaces con **catalogs activos** (7 paquetes en `pnpm-workspace.yaml`) y **`minimumReleaseAge: 1440`** declarado. Esos dos hechos condicionan la elección de tool: cualquier escaneador que no entienda `catalog:` corrompe la resolución al mover versiones al `package.json` consumer.

El comando `/experiments:npm-update-patch` debe funcionar igualmente en single-repo sin catalogs, con npm/yarn/bun/deno. Es project-agnostic: solo bump + install, sin asumir test runner, CI, ni estilo de commit.

## Goals / Non-Goals

**Goals:**

- Una skill `scan-npm-updates` reutilizable por 4 comandos (`patch|minor|major|engines`), aunque este change solo exponga `patch`.
- Detección automática de package manager (npm/pnpm/yarn/bun/deno) y repo type (single vs workspace).
- Respeto de `catalog:` (si existe) y `minimumReleaseAge` (si está declarado en el PM).
- Semántica de filter **waterfall**: `patch` reporta la mayor patch disponible aunque haya major por encima.
- Output estructurado que la skill pueda pasar al comando para presentarlo al usuario.
- Decisión de tool documentada con evidencia.

**Non-Goals:**

- Ejecutar tests, lint, build, o cualquier verificación post-install. El dev/agente invocante decide.
- Crear commits o PRs. Lo aplica al working tree y termina.
- Gestión de breaking changes o codemods (relevante para `major`, fuera de este change).
- Resolver update profundo de transitivas (`--deep`) — es MON-145 y siguientes.
- Cross-project orchestration (MON-152/153).
- Exponer la skill como módulo TS consumible por otro código; es una SKILL.md invocada por Claude.

## Decisions

### Decisión 1: Herramienta de escaneo = `npm-check-updates` (ncu), pin `21.0.2`

**Historia.** El borrador inicial del design eligió `taze` por waterfall + supuesto JSON output. La tarea del spike (1.1–1.8) invalidó dos premisas:

1. **Taze no tiene salida JSON** a día de hoy (v19.11.0). Confirmado por `taze --help`, source (`dist/cli.mjs`), y upstream issue `antfu-collective/taze#201` abierto desde 2025-08-27 sin merge. Parsear ANSI-coloreado con columnas variables es frágil de mantener.
2. **Ncu lee `minimumReleaseAge` de `pnpm-workspace.yaml` nativamente** (v21.x), emite banner `Using minimumReleaseAge from pnpm-workspace.yaml: 1 day` y aplica filtro. El post-proceso que el design anticipaba para el caso pnpm desaparece.

Adicional: en la fixture single-repo (`chalk@5.4.0`, `lodash@4.17.20`) ncu reportó ambos patches; taze reportó "up-to-date" (causa exacta no confirmada, pero evidencia reproducible contra taze para single-repo).

**Decisión: `ncu` con pin `npm-check-updates@21.0.2`.** Razones por orden de peso:

1. `--jsonUpgraded` da salida `{ name: targetVersion }` estable → cumple el contrato skill↔comando sin parser frágil.
2. Lectura nativa de `pnpm-workspace.yaml#minimumReleaseAge` → un branch menos en la skill para el PM principal del repo origen.
3. `--cooldown <period>` disponible para npm/yarn/bun/deno.
4. `-ws` / `--root` cubren workspaces; también aceptable iterar por `--packageFile` si `-ws` tiene quirks.

**Trade-offs aceptados.**

- **Waterfall se pierde**: `--target patch` es "cap" (ignora paquetes que solo ofrecen minor/major). En práctica es aceptable para `npm-update-patch`: el dev espera "patches dentro de la banda actual". Documentado en la skill.
- **Ni ncu ni taze dereferencian `catalog:`** de pnpm. Wash: la skill debe post-procesar en ambos casos.
- **Banner no-JSON en stdout**: `Using minimumReleaseAge...` se emite antes del JSON. La skill debe strippear cualquier línea no-JSON antes de `JSON.parse`.

**Taze queda como opción diferida** si upstream implementa `--json` (issue #201). El research doc justifica el pivot.

Registro completo de la validación vive en `research/taze-vs-ncu.md` dentro del change (nota de investigación, se archiva con el change).

### Decisión 2: La skill es un SKILL.md invocable, no un script TS

**Alternativas consideradas.**

- (A) `scripts/scan-npm-updates.ts` importable por varios comandos.
- (B) `skills/scan-npm-updates/SKILL.md` leída por Claude al invocarla.

**Elegida: B.** Rationale:

- Consistente con el patrón del plugin (`npm-changelog`, `plugin-version-bump`, `hookify`).
- La lógica no es determinística pura: requiere razonar sobre output de la tool, detectar PM cuando hay ambigüedad, adaptar mensajes de usuario. Eso es trabajo de Claude, no de un script.
- Evolución más barata: editar markdown > editar + publicar TS interno.
- Los comandos hermanos (`npm-update-minor`, `major`, `engines`) podrán invocar la misma skill cambiando un parámetro del prompt sin duplicar lógica.

**Trade-off:** no hay verificación estática del "contrato" entre skill y comando. Mitigación: spec define el contrato en Requirements con scenarios.

### Decisión 3: Contrato skill ↔ comando

La skill `scan-npm-updates` recibe un `level` (`patch|minor|major|engines`) y entrega estructura:

```
{
  packageManager: "pnpm|npm|yarn|bun|deno",
  repoType: "single|workspace",
  updates: [
    {
      name: string,
      currentVersion: string,
      targetVersion: string,
      location: "root" | "workspace:<pkg>" | "catalog:<name>",
      sourceFile: string,        // package.json path or pnpm-workspace.yaml
      skippedByReleaseAge?: boolean
    }
  ],
  warnings: string[]             // tool stderr, parse warnings, etc.
}
```

El comando `npm-update-patch`:
1. Invoca la skill con `level=patch`.
2. Si `updates.length === 0` → mensaje "no patch updates available" + exit.
3. Renderiza tabla (name, current → target, location).
4. `AskUserQuestion` con opciones: `apply-all | pick-subset | cancel`.
5. Si `pick-subset` → segundo prompt pidiendo nombres a excluir (coma-separados o línea por paquete; vacío = todos).
6. Aplica: bump en el `sourceFile` correspondiente + un solo `<pm> install` al final.
7. Muestra resumen: qué se aplicó, qué se skippeó, siguiente paso sugerido (tests / commit) **como mensaje**, sin ejecutarlo.

### Decisión 4: Invocación de la tool vía package manager dlx

No se añade dependencia npm al workspace. La skill ejecuta `pnpm dlx npm-check-updates@<pinned>` (o el equivalente: `npx` para npm, `yarn dlx` para yarn, `bunx` para bun, `deno run --allow-read --allow-write --allow-net --allow-env --allow-run npm:npm-check-updates@<pinned>` para deno). Pin de versión dentro de la SKILL.md para reproducibilidad; update manual del pin es una tarea de mantenimiento conocida.

**Alternativa descartada**: añadir `npm-check-updates` como devDep del workspace monolab. Rechazado porque la skill debe funcionar en cualquier repo, no solo este.

### Decisión 5: Catalogs como first-class

Cuando un paquete está declarado como `"vitest": "catalog:"` en un `package.json` y la entry existe en `pnpm-workspace.yaml` bajo `catalog:`, la skill reporta el update con `location: "catalog:default"` y `sourceFile: "pnpm-workspace.yaml"`. El bump se aplica editando `pnpm-workspace.yaml`, **no** el `package.json` consumer.

Ni ncu ni taze resuelven `catalog:` automáticamente (confirmado en spike). Por tanto la skill debe:

1. Leer `pnpm-workspace.yaml#catalog` directamente.
2. Construir un "pseudo-manifest" temporal con las entries del catalog como versiones normales (o consultar `npm view <pkg> versions --json` para cada entry).
3. Filtrar candidatos por el `level` solicitado, aplicando el `minimumReleaseAge` resuelto.
4. Reportar cada upgrade con `location: "catalog:default"` y `sourceFile: "pnpm-workspace.yaml"`.

Catalogs nombrados (`catalog:test`) quedan fuera de esta iteración (warning + lista).

### Decisión 6: UX de selección

Flujo:

```
┌─ 3 patch updates available ────────────────┐
│  vitest           4.0.18 → 4.0.24          │
│  jsdom            25.0.1 → 25.0.3          │
│  @testing-library 16.3.2 → 16.3.4          │
└────────────────────────────────────────────┘

> AskUserQuestion: "Apply updates?"
  [apply-all]      → aplica los 3
  [pick-subset]    → segundo prompt
  [cancel]         → exit
```

Si `pick-subset`: "Nombres a excluir (coma-separados, vacío = todos)". Valida que los nombres existan; si no, re-pregunta.

**Alternativa descartada**: una `AskUserQuestion` por paquete. Tedioso con >5 deps, y no aporta en el caso patches (casi siempre "sí a todo").

## Risks / Trade-offs

- **Riesgo**: ncu cambia el shape de `--jsonUpgraded` en release futuro y rompe el parseo de la skill.
  **Mitigación**: pin de versión en la SKILL.md; validación de shape antes de usar (si difiere, warning + abort con instrucciones de update).

- **Riesgo**: una dep con patch disponible tiene regresión conocida; usuario la aplica "a todo" sin saberlo.
  **Mitigación**: este change no mitiga activamente (non-goal). Sugerencia al usuario en el mensaje final: "considera revisar changelogs con `/experiments:npm-changelog`". Natural handoff entre comandos.

- **Riesgo**: `catalog:` con múltiples catalogs nombrados (pnpm 9.5+) no cubierto por defecto.
  **Mitigación**: primera entrega solo soporta `catalog:` default. Catalogs nombrados (`catalog:test`, etc.) → warning "ignored, not yet supported" y listar los saltados. Futuro change.

- **Riesgo**: la skill depende de `pnpm dlx`/`npx`/`yarn dlx`/`bunx` disponibles en PATH.
  **Mitigación**: verificación explícita al principio de la skill; mensaje claro si falta.

- **Trade-off**: sin tests automatizados post-install, un bump que rompe build pasa desapercibido hasta la siguiente ejecución del usuario.
  **Aceptado**: project-agnostic es un goal duro. El usuario sabe qué correr; el comando no presume.

- **Trade-off**: `ncu --target patch` es "cap" (omite paquetes cuyo máximo disponible es minor/major). Para `npm-update-patch` aceptable: el dev espera patches dentro de la banda actual. Si un paquete no ofrece patch en su banda, no se reporta (coherente con "no hay patch disponible").

- **Trade-off**: ncu emite un banner `Using minimumReleaseAge...` en stdout antes del JSON. Mitigación: skill strippea cualquier línea no-JSON antes de `JSON.parse`; valida que el objeto resultante tenga las claves esperadas.

## Migration Plan

No aplica: es un feature add, sin migración de usuarios existentes ni de estado persistido. El bump de versión del plugin `experiments` sigue el patrón estándar (`plugin.json` + `package.json` + `marketplace.json`).

## Open Questions

- ¿La skill debe emitir un dry-run artifact (JSON en `~/.claude/`) para debugging, similar a como `npm-changelog` cachea? Útil si el usuario quiere replay; costo: complejidad adicional. **Propuesta**: no en esta entrega; añadir en follow-up si aparece demanda.
- ¿Cómo interactúa con `renovate.json` del repo cuando está presente? Hoy renovate gestiona actualizaciones automatizadas en monolab. **Propuesta**: documentar que el comando es complementario (flujo manual/interactivo), no alternativo; sin integración especial.
