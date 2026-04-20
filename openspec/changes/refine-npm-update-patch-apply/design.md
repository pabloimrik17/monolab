## Context

El comando `/experiments:npm-update-patch` (spec `experiments-plugin` líneas 361–424) aplica bumps editando cada `sourceFile` con un `Edit` por paquete aceptado. Funcional, pero:

- La skill ya preserva prefijos `^`/`~`/exact → Claude tiene que hacer match exacto del string previo para no perderlos.
- Llamadas secuenciales `Edit` gastan contexto proporcional a N.
- Sin garantías sobre trailing commas, indentación exótica, o secciones duplicadas (mismo name en `dependencies` y `devDependencies` de repos mal higienizados).

Paralelamente, familias de paquetes con herramientas oficiales (Storybook el caso más claro) pierden automigrations y sincronización cross-package cuando se bumpean entry por entry.

La skill `scan-npm-updates` ya ejecuta `ncu` con `--jsonUpgraded` en modo read-only; la herramienta también sabe reescribir manifests con `--upgrade`. La premisa del change es reusar esa capacidad en la fase de apply, mantener catalogs por el camino actual (ncu no los soporta en 21.x salvo confirmación del spike), y añadir un gancho de overrides para casos como Storybook.

## Goals / Non-Goals

**Goals:**

- Reemplazar el bucle de `Edit` en Step 6 por una invocación `ncu --upgrade` por manifest (`package.json`) cuando el tipo de `sourceFile` sea un manifest normal.
- Permitir `pick-subset` con `--filter` literal (lista de nombres separados por espacios).
- Mantener determinismo entre scan y apply: el apply usa las mismas flags de `--target`, `--cooldown` y `minimumReleaseAge` resueltas en el scan.
- Introducir un registry de overrides por paquete en forma de data file (YAML), leído por el comando, fácilmente extensible (añadir entry = editar YAML).
- Storybook como primera entry del registry; acción por defecto: preguntar al usuario qué hacer.
- Mantener catalogs (`pnpm-workspace.yaml#catalog`) en el camino actual hasta que un spike confirme/refute soporte en ncu 21.x.
- Ningún cambio visible fuera de Step 6 para paquetes no-registry en set aceptado no-catalog.

**Non-Goals:**

- Ejecutar tests, lint, build, commits (sigue igual: hard rule).
- Soportar catalogs nombrados (`catalog:test`, etc.). Tracked separately (MON).
- Añadir más entries al registry más allá de Storybook. El change deja el formato listo; entries futuras van en changes siguientes.
- Escribir un script TS: la lógica sigue viviendo en el markdown del comando, interpretado por Claude, con datos externos solo para el registry.
- Detectar automáticamente que un paquete "tiene codemod oficial" (heurística imposible sin telemetría upstream). El registry es la única fuente de verdad.

## Decisions

### Decisión 1: `ncu --upgrade` por manifest para Step 6 (no edit-loop)

**Elegido.** Para cada `sourceFile` que sea un `package.json` (no catalog), el comando ejecuta **una** invocación:

```
<runner-prefix> npm-check-updates@21.0.2 \
  --target patch \
  --upgrade \
  --packageFile <path> \
  [--cooldown <period>]        # solo cuando el scan usó --cooldown
  [--filter "<names...>"]      # solo en pick-subset
```

El runner-prefix se resuelve igual que en el scan (`pnpm dlx`, `npx -y`, `yarn dlx`, `bunx`, `deno run ...`).

Rationale:

- Reusa la lógica de prefix-preservation y format-preservation de ncu (battle-tested upstream).
- Reduce el coste de contexto: una bash call por manifest en lugar de N Edit calls.
- El upstream de ncu es explícito sobre idempotencia de `--upgrade` y trabajo en-place.

**Alternativas consideradas.**

- **(A) Parseo JSON explícito del package.json y set de version keys.** Deterministic pero perderíamos la detección de prefix que ncu ya hace; además, cada PM puede tener quirks (bun usa `dependenciesOverride`, pnpm tiene `pnpm.overrides`, etc.) que ncu conoce.
- **(B) Un solo `ncu -ws` global en workspaces.** El shape de output varía entre versiones y mezcla manifests en un blob; la invocación por manifest es predecible y alineada con lo que el scan ya hace.

### Decisión 2: `--filter` con lista literal de nombres separados por espacios

**Elegido.** `pick-subset` materializa `ACCEPTED` como `"name-a name-b @scope/name-c"`. Ncu documenta que `--filter` acepta (a) una lista space-separated, (b) un glob, o (c) un regex. Para evitar interpretaciones accidentales (por ejemplo, un nombre con `+` se lee como regex), el comando pasa la lista literal tras un spike de verificación.

**Spike requerido (tasks §1.1):**

- Crear fixture con 3 paquetes con patch disponible, nombres que incluyan caracteres regex-significativos (`@scope/foo`, `postcss-import`, `eslint-plugin-storybook`).
- Ejecutar `ncu --upgrade --packageFile pkg.json --filter "@scope/foo postcss-import"`.
- Confirmar: solo esos dos se reescriben; el tercero no se toca.
- Si falla (ncu interpreta como regex): fallback a `--filter` con N invocaciones (una por paquete), o serializar nombres con escaping. Registrar decisión en el spike.

**Alternativa considerada.** Usar `ncu --upgrade --reject "excluded"` (es la opción opuesta). Rechazada: `pick-subset` ya produce la lista de aceptados; passar aceptados es menos ambiguo que passar rechazados cuando hay paquetes fuera del scan-output que nunca estuvieron en juego.

### Decisión 3: Flag mirroring scan↔apply

El scan resuelve `minimumReleaseAge` y usa `--cooldown` o delega al read-native de ncu (pnpm). El apply DEBE usar exactamente las mismas flags. Razón: el apply re-invoca ncu, que re-descubre el target. Sin las mismas flags, un candidate filtrado por age en el scan podría aparecer como target en el apply (TOCTOU ↑ window).

**Implementación.** El comando guarda en memoria las flags computadas por la skill (ya estaban ahí; se propagan explícitamente a Step 6) y las mete en la invocación de apply. En el caso pnpm, ncu lee `pnpm-workspace.yaml` también en apply → no hace falta propagar nada.

**Trade-off aceptado.** Pequeña ventana de TOCTOU entre scan y apply (segundos). El filtro `minimumReleaseAge` ya descarta versiones publicadas muy recientemente, así que el riesgo real de drift es bajo.

### Decisión 4: Catalogs siguen por el camino en-memoria (con spike)

`pnpm-workspace.yaml#catalog` sigue editado por el comando directamente (como en la spec actual). Antes de cerrar el change, un spike verifica si ncu 21.x ya sabe reescribir catalogs.

**Spike requerido (tasks §1.2).**

- Fixture con `pnpm-workspace.yaml` y un catalog entry desactualizado.
- Ejecutar `ncu --target patch --upgrade --packageFile pnpm-workspace.yaml` (o con `--packageManager pnpm`).
- Resultado esperado (basado en issue del reporter): "no updates". Si sorprende y funciona, documentar y extender Step 6 a catalogs.
- Si no funciona: el camino actual (find-replace el key `name:` dentro de `catalog:` preservando indentación) se mantiene sin cambios.

### Decisión 5: Registry de overrides como data file YAML

**Ubicación:** `claude-plugins/experiments/skills/scan-npm-updates/data/pkg-upgrade-overrides.yaml` (respuesta del usuario: bajo la propia skill).

**Shape:**

```yaml
# claude-plugins/experiments/skills/scan-npm-updates/data/pkg-upgrade-overrides.yaml
overrides:
  - id: storybook
    matches:
      - storybook
      - "@storybook/*"
      - eslint-plugin-storybook
      - "storybook-addon-*"
    command: "npx storybook@{version} upgrade"
    versionSource: target-of:storybook    # ver semántica abajo
    fallbackVersionSource: max-target-of:@storybook/*
    reference: https://storybook.js.org/docs/releases/upgrading
    notes: "Sincroniza todos los @storybook/* a {version} y corre automigrations."
```

**Semántica de matching.**

- `matches` es una lista de patrones con glob simple (`*` como wildcard). Un paquete del scan matchea si su nombre coincide con cualquier patrón.
- Un paquete matchea como máximo **una** entry (primera que coincida en orden de declaración).

**Semántica de versionSource.**

- `target-of:<name>`: usa el `targetVersion` del paquete `<name>` si está en ACCEPTED; si no, cae a `fallbackVersionSource`.
- `max-target-of:<glob>`: max semver de los `targetVersion` de los paquetes que matcheen el glob en ACCEPTED.
- `latest`: literal `latest` (para entries que acepten "bump a lo que sea el último stable").

Storybook usa `target-of:storybook` con fallback a `max-target-of:@storybook/*` porque el paquete `storybook` suele estar presente; si no, se usa la máxima del resto de `@storybook/*`.

**Formato elegido: YAML.** Alternativas: JSON (verboso para los comentarios que documentan cada entry) y prose markdown dentro de `SKILL.md` (no parseable, difícil de extender). YAML se alinea con `pnpm-workspace.yaml` del repo principal y tiene comentarios.

**Lector.** El comando lee el YAML con `cat <path>` + parseo estructural (Claude interpreta YAML nativamente; no necesita `yq`). Si el archivo falta o es inválido, el comando emite warning y procede sin registry (legacy behavior).

### Decisión 6: UX cuando el registry matchea

Inmediatamente después del primary prompt (`apply-all` / `pick-subset` / `cancel`) y antes de Step 6, si `ACCEPTED` contiene paquetes que matchean alguna entry del registry:

```
> AskUserQuestion: "<entry.id> detected in accepted set. <entry.notes>
  Suggested: <interpolated command>. What do you want to do?"

  [run-override]   → ejecuta el command override; excluye paquetes matcheados del flujo ncu --upgrade
  [skip-matched]   → omite los paquetes matcheados (ni se bumpean ni se corre override)
  [force-generic]  → bumpea los paquetes matcheados con ncu --upgrade normal (legacy)
```

Una pregunta por entry (si hubiera varias entries matcheando en una sola invocación, que es edge case raro pero posible con glob amplio, se hace N preguntas secuenciales, una por entry).

**Interpolación `{version}`.**

- Se resuelve con el `versionSource` de la entry antes de presentar la pregunta.
- Si la resolución falla (p. ej. `target-of:storybook` y el paquete no está en ACCEPTED y no hay fallback válido): warning + skip de la override prompt (sigue con ncu --upgrade legacy para los matcheados).

**Alternativas descartadas.**

- **Auto-run.** Rechazada: `storybook upgrade` lanza automigrations y prompts interactivos (depende de versión); auto-ejecutarlo sin consentimiento explícito rompe el principio "the command does bump + install only".
- **Warn-and-skip silencioso.** Rechazada: obliga al usuario a leer el summary final y correr el comando después; high friction para el happy path.

### Decisión 7: Post-override, no se corre el `<pm> install` final

`storybook upgrade` (y overrides futuras) típicamente gestionan su propio install. Si se ejecutó un override:

- El comando **no** corre el `<pm> install` final automático para los paquetes matcheados.
- Si además hay paquetes NO matcheados bumpeados por ncu, SÍ se corre un `<pm> install` al final (lo normal).
- Caso raro: todos los aceptados son override-matched → no install separado; se asume que el override lo hizo.

Esto va documentado en el summary final, para que el usuario sepa qué se ejecutó.

## Risks / Trade-offs

- **Riesgo**: ncu reinterpreta `--filter "a b c"` como regex en alguna edge y reescribe paquetes no aceptados.
  **Mitigación**: spike §1.1 con fixture que incluye caracteres regex-significativos antes de implementar.

- **Riesgo**: `ncu --upgrade` reescribe el manifest con formato ligeramente distinto al original (ordering, indentation, trailing newline).
  **Mitigación**: documentar en el summary que el formato puede variar ligeramente; ncu upstream es estable respecto a preservación pero no es un round-trip parser. Aceptado: el diff es reviewable.

- **Riesgo**: el override de Storybook corre automigrations destructivas en el working tree del usuario (mueve código, renombra archivos).
  **Mitigación**: la pregunta del Step 6.5 lo explica en `notes`. El usuario decide; si dice `run-override`, asume la consecuencia. El comando no oculta nada.

- **Riesgo**: el YAML del registry contiene errores (typo en glob, versionSource inválida) y el comando falla en un lugar no relacionado.
  **Mitigación**: al cargar el YAML, validar shape mínimo; si falla, warning + skip registry (no aborta la invocación entera).

- **Riesgo**: entre scan y apply alguien publica una patch nueva que sortea `minimumReleaseAge`.
  **Mitigación**: mirroring de flags (Decisión 3); la ventana real es de segundos. Aceptado.

- **Trade-off**: el registry es un data file mantenido a mano. Sin auto-sync con upstream (storybook-next publica una nueva versión → nadie actualiza el YAML). Aceptado: el registry solo dicta el command template, no versiones; `{version}` viene del scan en cada invocación.

- **Trade-off**: añadir overrides futuras (next, nx, turbo, astro) requiere editar YAML + validar UX. No se pre-arman entries; este change solo establece formato.

## Migration Plan

No aplica como migración de datos. Pasos de corte:

1. Implementar spikes (tasks §1.1, §1.2) y cerrar decisiones.
2. Editar `commands/npm-update-patch.md` con nuevo Step 6 y nueva fase de registry prompt.
3. Crear `skills/scan-npm-updates/data/pkg-upgrade-overrides.yaml` con el seed de Storybook.
4. Bump plugin version 0.6.0 → 0.7.0 en los tres archivos (via `experiments:plugin-version-bump`).
5. Sync de `openspec/specs/experiments-plugin/spec.md` via `/opsx:sync`.
6. Validación manual en monolab (mismo patrón que el change original) + en fixture con Storybook instalado.

Sin rollback necesario: el comportamiento viejo (edit-loop) vive solo en el spec previo; revertir el change restaura el comportamiento anterior.

## Open Questions

- **¿Glob engine para `matches`?** Propuesta: minimatch-like (solo `*` como wildcard literal de un segmento de nombre). No hace falta full-blown glob; los patrones son cortos y la implementación en prompt instruction es mínima. Confirmar si algún caso real necesita `?` o `{a,b}` (no identificado).
- **¿El override prompt debe aparecer también en `apply-all`?** Sí (decidido). Cualquier apply que involucre paquetes matcheados dispara la pregunta, da igual cómo llegaron al set aceptado.
- **¿Qué pasa si la invocación `npx storybook@X upgrade` falla?** Propuesta: capturar exit code ≠ 0, mostrar mensaje claro, **no** correr `ncu --upgrade` como fallback (el estado queda mixto). El usuario relanza el comando si quiere.
