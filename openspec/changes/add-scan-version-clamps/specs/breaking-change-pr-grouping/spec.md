## MODIFIED Requirements

### Requirement: Hard co-upgrade sets precede risk grouping

The skill SHALL first compute **hard co-upgrade sets** — packages that MUST share a bucket — from peer/lockstep relationships, seeded from the shared version-group registry `references/version-groups.yaml` in the `scan-npm-updates` skill (the single source of truth for locked families, e.g. `react`+`react-dom`+`react-is`+`@types/react`; `@storybook/*`; `vue`+`@vue/*`; `vitest`+`@vitest/*`), augmented by the override-registry families and a `peerDependencies` read. The skill SHALL NOT maintain its own hardcoded family list that could drift from the shared registry. Risk heuristics SHALL only decide whether an already-cohesive set is isolated or batched; they SHALL NOT split a co-upgrade set across buckets.

#### Scenario: Peer set never split

- **WHEN** `react` and `react-dom` both have a major update
- **THEN** they appear in the same bucket regardless of risk scoring

#### Scenario: Families sourced from shared registry

- **WHEN** the shared `references/version-groups.yaml` declares the `vitest` ↔ `@vitest/*` family and both `vitest` and `@vitest/browser` have a major update
- **THEN** they are computed as one hard co-upgrade set and share a bucket
