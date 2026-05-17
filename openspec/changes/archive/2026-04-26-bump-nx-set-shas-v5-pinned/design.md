## Context

`.github/workflows/ci.yml` usa `nrwl/nx-set-shas@v4` (tag mutable). El upgrade a v5 (Node 24, sin breaking changes en inputs/outputs) coincide con la oportunidad de endurecer la postura de seguridad supply-chain pineando todas las actions a commit SHA. Renovate ya está adoptado en el repo (`renovate.json` con `rangeStrategy: pin` y customManagers para npm), pero no está configurado para gestionar SHAs de actions ni para amortiguar spikes de PRs.

## Goals / Non-Goals

**Goals:**
- Bump `nrwl/nx-set-shas` v4 → v5
- Pinear a commit SHA con comentario semver legible
- Que Renovate mantenga el pin actualizado automáticamente sin intervención manual
- Política reproducible y sin excepciones: pinear todas las actions (incluidas `actions/*`)
- Endurecer cadencia Renovate: stagger por tipo de update + extender ventana de release-age

**Non-Goals:**
- Migrar otros workflows o actions en este change manualmente (Renovate los pineará en el siguiente ciclo)
- Cambiar `rangeStrategy` global o `prConcurrentLimit`/`prHourlyLimit`
- Configurar automerge para patches (queda pendiente para un change posterior si se decide)

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

### Decision 3: Pinear también `actions/*` (sin carve-out)

**Elegido**: política uniforme — todas las actions (third-party y `actions/*`) se pinean a SHA.

**Por qué**:
- OpenSSF Scorecard "Pinned-Dependencies" exige SHA en todas las actions; un carve-out baja la nota
- Confiar en GitHub no es bulletproof: incluso `actions/*` puede verse comprometido (credenciales filtradas, insider, dependencia compartida)
- El argumento de "ruido de PRs" se neutraliza con el stagger + grouping: ~2-3 PRs/trimestre vs. los 20/año estimados originalmente
- Consistencia: una sola regla > excepción que mantener

**Alternativa descartada**: exempt `actions/*` con `packageRules: [{ matchPackageNames: ["actions/*"], pinDigests: false }]`. Razón: contradice OpenSSF y añade superficie conceptual.

### Decision 4: Pinear manualmente todas las actions en este change (no diferir a Renovate)

**Elegido**: pinear a mano `nrwl/nx-set-shas` y todas las demás actions de `ci.yml` y `release-please.yml` (`actions/*`, `pnpm/action-setup`, `codecov/*`, `googleapis/release-please-action`, `denoland/setup-deno`) al mismo SHA + comentario semver.

**Por qué**: si se diferiera a Renovate, el spec (`### Requirement: All GitHub Actions SHALL be pinned to commit SHA`) quedaría no conforme entre el merge de este change y el primer ciclo de Renovate (potencialmente semanas, dado `minimumReleaseAge: 14d` + stagger trimestral para majors). Pinear todo ahora elimina esa ventana de divergencia spec/implementación y no depende de un sistema externo para alcanzar conformidad. Coste: ~10 SHAs adicionales en el diff. Beneficio: spec-compliant al hacer merge, sin gap.

**Alternativa descartada**: solo pinear `nrwl/nx-set-shas` y dejar que Renovate haga el resto en el siguiente ciclo. Razón: introduce ventana de no-conformidad con el spec recién creado y dependencia operativa de Renovate (rate limits, schedule, posible rename del preset) para alcanzar el estado declarado.

### Decision 5: Stagger Renovate schedules + bump `minimumReleaseAge` a 14d

**Elegido**:
- patch → día 1 del mes
- minor → día 8 cada 2 meses
- major → día 15 cada 3 meses
- `minimumReleaseAge`: `7 days` → `14 days`

**Por qué stagger**: con todos en día 1 los ciclos colisionan (1-Jan, 1-Jul) → batch de PRs en un único día → spike de CI. Spread por día reparte la carga.

**Por qué 14d**: incidentes de supply-chain en npm (eslint-config-prettier 2025, chalk, etc.) a veces tardan 7-14d en ser detectados/yanked. 14d es el floor recomendado por StepSecurity y OpenSSF; el coste es solo retrasar 1 semana extra cada update.

**Alternativa descartada**: 21-30d. Demasiado conservador; perdemos frescura sin ganar mucha seguridad adicional una vez pasada la ventana de detección típica.

## Risks / Trade-offs

- [SHA inválido o tag movido] → Mitigación: SHA verificado contra `git/tags/v5.0.1` API antes de pinear
- [Renovate no actualiza el comentario semver] → Mitigación: usar el preset oficial `ToSemver` que está diseñado para esto; verificar después de merge con la próxima publicación de `nx-set-shas`
- [v5 introduce un breaking no documentado] → Mitigación: revert es 1 línea; CI corre en branch antes de merge
- [PRs ruidosas si Renovate decide pinear todo de golpe] → Mitigación: stagger por update type + `prConcurrentLimit: 10` + `prHourlyLimit: 2`
- [`minimumReleaseAge: 14d` retrasa fixes de seguridad] → Mitigación: `:enableVulnerabilityAlertsWithLabel(security)` ya bypassa la ventana para vulnerabilidades CVE conocidas

## Migration Plan

1. Actualizar `ci.yml` con SHA pin
2. Actualizar `renovate.json`: añadir preset, bump `minimumReleaseAge`, stagger schedules
3. Push branch, verificar que CI pasa con v5
4. Merge a `develop`
5. Verificación post-merge: en el próximo ciclo de Renovate, comprobar que abre PRs de pin para el resto de actions (third-party y `actions/*`)

**Rollback**: revert del commit. La action v4 sigue siendo soportada upstream.
