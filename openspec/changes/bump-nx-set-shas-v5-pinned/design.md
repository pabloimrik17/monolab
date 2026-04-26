## Context

`.github/workflows/ci.yml` usa `nrwl/nx-set-shas@v4` (tag mutable). El upgrade a v5 (Node 24, sin breaking changes en inputs/outputs) coincide con la oportunidad de endurecer la postura de seguridad supply-chain pineando actions de terceros a commit SHA. Renovate ya está adoptado en el repo (`renovate.json` con `rangeStrategy: pin` y customManagers para npm), pero no está configurado para gestionar SHAs de actions.

## Goals / Non-Goals

**Goals:**
- Bump `nrwl/nx-set-shas` v4 → v5
- Pinear a commit SHA con comentario semver legible
- Que Renovate mantenga el pin actualizado automáticamente sin intervención manual
- Establecer política reproducible: solo pinear actions de terceros

**Non-Goals:**
- Pinear actions oficiales de GitHub (`actions/*`) — confianza alta, ruido bajo
- Migrar otros workflows o actions en este change (queda pendiente para un sweep posterior si se desea)
- Cambiar la cadencia de Renovate o `rangeStrategy` global

## Decisions

### Decision 1: Pinear solo a `v5.0.1` (último), no `v5` flotante

**Elegido**: SHA `afb73a62d26e41464e9254689e1fd6122ee683c1` con comentario `# v5.0.1`.

**Alternativa descartada**: pinear al SHA del tag `v5` (que también apunta a v5.0.1 hoy) — pero el tag `v5` es mutable upstream, así que aunque el SHA se mantenga estable, conceptualmente seguimos con un floating major. Pinear al SHA correspondiente a `v5.0.1` deja claro qué versión exacta corre.

### Decision 2: Renovate preset `helpers:pinGitHubActionDigestsToSemver`

**Elegido**: añadir `helpers:pinGitHubActionDigestsToSemver` al array `extends` de `renovate.json`.

**Por qué**: este preset combina dos comportamientos críticos:
1. `pinDigests: true` para `github-actions` manager — convierte tags a SHA
2. Mantiene `# vX.Y.Z` como comentario semver, lo cual permite a Renovate hacer bumps "minor/major" basados en el comentario en vez del SHA opaco

**Alternativa descartada**: `pin-github-action-digests` (sin "ToSemver") — no preserva info semver y futuras updates aparecerían como SHA opacos sin contexto de versión.

**Alternativa descartada**: configuración manual con `packageRules: [{ matchManagers: ["github-actions"], pinDigests: true }]` — más verboso y duplica lo que el preset ya hace.

### Decision 3: Excluir `actions/*` del pinning

**Elegido**: política documentada en spec — `actions/*` queda en major tag.

**Por qué**: 
- Riesgo bajo (mantenido por GitHub)
- Reduce ~20 PRs/año de Renovate (hay 6 usos de `actions/*` en el workflow actual)
- Otros equipos hacen lo mismo (ej. `step-security/harden-runner` documenta esta práctica)

**Trade-off**: si GitHub se ve comprometido, el pinning no protegería igualmente. Aceptable.

### Decision 4: No tocar el resto de actions de terceros en este change

**Elegido**: solo `nrwl/nx-set-shas` ahora.

**Por qué**: el issue es específico para v5 bump. Pinear `pnpm/action-setup`, `codecov/*`, etc. amerita su propio change para evitar mezclar bump (necesario) con sweep (opcional). Una vez merged el preset de Renovate, abrirá PRs automáticas para el resto.

## Risks / Trade-offs

- [SHA inválido o tag movido] → Mitigación: SHA verificado contra `git/tags/v5.0.1` API antes de pinear
- [Renovate no actualiza el comentario semver] → Mitigación: usar el preset oficial `ToSemver` que está diseñado para esto; verificar después de merge con la próxima publicación de `nx-set-shas`
- [v5 introduce un breaking no documentado] → Mitigación: revert es 1 línea; CI corre en branch antes de merge
- [PRs ruidosas si Renovate decide pinear todo de golpe] → Mitigación: el `prConcurrentLimit: 10` y el schedule mensual ya limitan la avalancha

## Migration Plan

1. Actualizar `ci.yml` con SHA pin
2. Actualizar `renovate.json` con preset
3. Push branch, verificar que CI pasa con v5
4. Merge a `develop`
5. Verificación post-merge: en el próximo ciclo de Renovate, comprobar que abre PRs de pin para otras actions de terceros (señal de que el preset funcionó)

**Rollback**: revert del commit. La action v4 sigue siendo soportada upstream.
