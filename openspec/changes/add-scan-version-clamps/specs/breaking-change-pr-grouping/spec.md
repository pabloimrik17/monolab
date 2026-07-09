## MODIFIED Requirements

### Requirement: Hard co-upgrade sets precede risk grouping

The skill SHALL first compute **hard co-upgrade sets** — packages that MUST share a bucket — before any risk scoring, from three sources: (1) a `peerDependencies` read (the primary source, recovering most families, e.g. `react-dom`→`react`, `@angular/*`→`@angular/core`); (2) the override-registry families; and (3) a small skill-owned version-lockstep registry at `references/version-groups.yaml` (this skill's folder) for lockstep members that have no peer edge and would otherwise be split (e.g. `react-is` + `@types/react` alongside `react`; `vitest` + `@vitest/*`). This registry SHALL be kept minimal (only families the peer/override sources miss) and SHALL degrade gracefully (skip, no abort) when absent or empty. It is NOT read by `scan-npm-updates`. Risk heuristics SHALL only decide whether an already-cohesive set is isolated or batched; they SHALL NOT split a co-upgrade set across buckets.

#### Scenario: Peer set never split

- **WHEN** `react` and `react-dom` both have a major update
- **THEN** they appear in the same bucket regardless of risk scoring

#### Scenario: Lockstep family sourced from the registry

- **WHEN** the version-lockstep registry declares the `vitest` ↔ `@vitest/*` family and both `vitest` and `@vitest/browser` have a major update
- **THEN** they are computed as one hard co-upgrade set and share a bucket
