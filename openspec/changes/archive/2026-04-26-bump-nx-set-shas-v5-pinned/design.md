## Context

`.github/workflows/ci.yml` uses `nrwl/nx-set-shas@v4` (mutable tag). The upgrade to v5 (Node 24, no breaking changes in inputs/outputs) coincides with the opportunity to harden the supply-chain security posture by pinning all actions to a commit SHA. Renovate is already adopted in the repo (`renovate.json` with `rangeStrategy: pin` and customManagers for npm), but it is not configured to manage action SHAs nor to dampen PR spikes.

## Goals / Non-Goals

**Goals:**
- Bump `nrwl/nx-set-shas` v4 → v5
- Pin to a commit SHA with a readable semver comment
- Have Renovate keep the pin updated automatically without manual intervention
- Reproducible, no-exceptions policy: pin all actions (including `actions/*`)
- Harden the Renovate cadence: stagger by update type + extend the release-age window

**Non-Goals:**
- Manually migrate other workflows or actions in this change (Renovate will pin them in the next cycle)
- Change the global `rangeStrategy` or `prConcurrentLimit`/`prHourlyLimit`
- Configure automerge for patches (deferred to a later change if decided)

## Decisions

### Decision 1: Pin only to `v5.0.1` (latest), not floating `v5`

**Chosen**: SHA `afb73a62d26e41464e9254689e1fd6122ee683c1` with comment `# v5.0.1`.

**Discarded alternative**: pin to the SHA of the `v5` tag (which also points to v5.0.1 today) — but the `v5` tag is mutable upstream, so even though the SHA stays stable, conceptually we remain on a floating major. Pinning to the SHA corresponding to `v5.0.1` makes it clear which exact version runs.

### Decision 2: Renovate preset `helpers:pinGitHubActionDigestsToSemver`

**Chosen**: add `helpers:pinGitHubActionDigestsToSemver` to the `extends` array of `renovate.json`.

**Why**: this preset combines two critical behaviors:
1. `pinDigests: true` for the `github-actions` manager — converts tags to SHA
2. Keeps `# vX.Y.Z` as a semver comment, which lets Renovate make "minor/major" bumps based on the comment instead of the opaque SHA

**Discarded alternative**: `pin-github-action-digests` (without "ToSemver") — does not preserve semver info and future updates would appear as opaque SHAs without version context.

**Discarded alternative**: manual configuration with `packageRules: [{ matchManagers: ["github-actions"], pinDigests: true }]` — more verbose and duplicates what the preset already does.

### Decision 3: Also pin `actions/*` (no carve-out)

**Chosen**: uniform policy — all actions (third-party and `actions/*`) are pinned to SHA.

**Why**:
- OpenSSF Scorecard "Pinned-Dependencies" requires SHA on all actions; a carve-out lowers the score
- Trusting GitHub is not bulletproof: even `actions/*` can be compromised (leaked credentials, insider, shared dependency)
- The "PR noise" argument is neutralized with the stagger + grouping: ~2-3 PRs/quarter vs. the 20/year originally estimated
- Consistency: a single rule > an exception to maintain

**Discarded alternative**: exempt `actions/*` with `packageRules: [{ matchPackageNames: ["actions/*"], pinDigests: false }]`. Reason: contradicts OpenSSF and adds conceptual surface.

### Decision 4: Manually pin all actions in this change (do not defer to Renovate)

**Chosen**: manually pin `nrwl/nx-set-shas` and all other actions in `ci.yml` and `release-please.yml` (`actions/*`, `pnpm/action-setup`, `codecov/*`, `googleapis/release-please-action`, `denoland/setup-deno`) to the same SHA + semver comment.

**Why**: if deferred to Renovate, the spec (`### Requirement: All GitHub Actions SHALL be pinned to commit SHA`) would be non-compliant between the merge of this change and the first Renovate cycle (potentially weeks, given `minimumReleaseAge: 14d` + quarterly stagger for majors). Pinning everything now eliminates that spec/implementation divergence window and does not depend on an external system to reach compliance. Cost: ~10 additional SHAs in the diff. Benefit: spec-compliant on merge, no gap.

**Discarded alternative**: pin only `nrwl/nx-set-shas` and let Renovate do the rest in the next cycle. Reason: introduces a window of non-compliance with the newly created spec and an operational dependency on Renovate (rate limits, schedule, possible preset rename) to reach the declared state.

### Decision 5: Stagger Renovate schedules + bump `minimumReleaseAge` to 14d

**Chosen**:
- patch → day 1 of the month
- minor → day 8 every 2 months
- major → day 15 every 3 months
- `minimumReleaseAge`: `7 days` → `14 days`

**Why stagger**: with everything on day 1 the cycles collide (1-Jan, 1-Jul) → batch of PRs on a single day → CI spike. Spreading by day distributes the load.

**Why 14d**: npm supply-chain incidents (eslint-config-prettier 2025, chalk, etc.) sometimes take 7-14d to be detected/yanked. 14d is the floor recommended by StepSecurity and OpenSSF; the cost is only delaying each update by 1 extra week.

**Discarded alternative**: 21-30d. Too conservative; we lose freshness without gaining much additional security once past the typical detection window.

## Risks / Trade-offs

- [Invalid SHA or moved tag] → Mitigation: SHA verified against the `git/tags/v5.0.1` API before pinning
- [Renovate does not update the semver comment] → Mitigation: use the official `ToSemver` preset that is designed for this; verify after merge with the next `nx-set-shas` release
- [v5 introduces an undocumented breaking change] → Mitigation: revert is 1 line; CI runs on the branch before merge
- [Noisy PRs if Renovate decides to pin everything at once] → Mitigation: stagger by update type + `prConcurrentLimit: 10` + `prHourlyLimit: 2`
- [`minimumReleaseAge: 14d` delays security fixes] → Mitigation: `:enableVulnerabilityAlertsWithLabel(security)` already bypasses the window for known CVE vulnerabilities

## Migration Plan

1. Update `ci.yml` with the SHA pin
2. Update `renovate.json`: add preset, bump `minimumReleaseAge`, stagger schedules
3. Push branch, verify CI passes with v5
4. Merge to `develop`
5. Post-merge verification: in the next Renovate cycle, check that it opens pin PRs for the remaining actions (third-party and `actions/*`)

**Rollback**: revert the commit. The v4 action is still supported upstream.
