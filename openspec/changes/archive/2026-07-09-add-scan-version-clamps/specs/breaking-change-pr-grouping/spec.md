## MODIFIED Requirements

### Requirement: Hard co-upgrade sets precede risk grouping

The skill SHALL first compute **hard co-upgrade sets** — packages that MUST share a bucket — before any risk scoring, from: (1) a `peerDependencies` read (the authoritative source, recovering most families, e.g. `react-dom`→`react`, `@vitest/*`→`vitest`, `@angular/*`→`@angular/core`); and (2) the override-registry families. The skill SHALL NOT maintain a hardcoded family list or a family registry (neither its own nor a shared one). For the residual case the peer read cannot express — a `@types/*` package that pairs with its runtime but declares no peer edge — the executing agent MAY recognize the obvious lockstep pairing from the package names; this reasoning SHALL NOT be codified as a maintained list. Risk heuristics SHALL only decide whether an already-cohesive set is isolated or batched; they SHALL NOT split a co-upgrade set across buckets.

#### Scenario: Peer set never split

- **WHEN** `react` and `react-dom` both have a major update
- **THEN** they appear in the same bucket regardless of risk scoring (recovered from `react-dom`'s peer on `react`)

#### Scenario: Vitest family recovered from peerDependencies

- **WHEN** `vitest` and `@vitest/browser` both have a major update
- **THEN** they are computed as one hard co-upgrade set and share a bucket (recovered from `@vitest/browser`'s peer on `vitest`, with no maintained family list)

#### Scenario: No hardcoded family list

- **WHEN** the skill computes hard co-upgrade sets
- **THEN** it relies on the `peerDependencies` read and the override registry (plus agent reasoning for peer-less types pairings), and does NOT read or maintain a version-group family file
