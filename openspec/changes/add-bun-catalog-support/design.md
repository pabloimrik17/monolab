## Context

`scan-npm-updates` (capability `npm-update-scanning`) and `apply-npm-updates` (capability `npm-update-apply`) are the two shared skills every `npm-update-*` / `commander-update-*` command funnels through. Both handle catalogs **only** for pnpm, keyed off `pnpm-workspace.yaml#catalog`:

- Scan reads `pnpm-workspace.yaml`, emits `{ location: "catalog:default", sourceFile: "pnpm-workspace.yaml" }` records; named catalogs produce an "unsupported" warning.
- Apply edits `pnpm-workspace.yaml` in place via `catalogEdits: { name, targetVersion }` (the source file is implicit).

Bun declares catalogs in the **root `package.json`** — `catalog` (the bare default, referenced `catalog:`) and `catalogs.<name>` (named, referenced `catalog:<name>`), each placeable top-level **or** nested under `workspaces`. The scan never reads these maps, so Bun catalog deps are invisible → silently never updated. The spike (`research/ncu-bun-catalog-spike.md`) confirmed ncu@21.0.2 neither rewrites consumer `catalog:*` refs nor touches the source maps, so the *only* confirmed defect is the missing scan/apply of the Bun source.

## Goals / Non-Goals

**Goals:**

- Scan detects Bun catalog sources in `package.json` and emits update records for the bare default (`catalog:default`) and every named catalog (`catalog:<name>`).
- Apply bumps Bun catalog entries in `package.json` at the exact JSON node, preserving formatting/key order.
- Make the "never rewrite a consumer `catalog:` reference" invariant package-manager-agnostic (defense-in-depth).
- pnpm scan/apply behavior stays **byte-identical**.

**Non-Goals:**

- No change to pnpm catalog handling (pnpm named-catalog warning unchanged this iteration).
- No ncu-based catalog bumping — ncu does not write catalog maps; the in-memory edit path stays the single mechanism.
- No catalog support for npm/yarn/deno (no comparable feature).
- Not treating the (non-reproducing) consumer-ref rewrite as an active bug — the guard is defensive only.
- No tests/lint/build/commits added to the flow; no engines/toolchain changes.

## Decisions

**D1 — Detection keyed off the already-detected package manager.** When `packageManager === "bun"`, read Bun catalog sources from the root `package.json`; when `"pnpm"`, keep the `pnpm-workspace.yaml` path. No new heuristic ("does `package.json#catalogs` exist?") — the PM is already resolved from the lockfile, and pnpm/bun are mutually exclusive in practice. *Alt considered:* trigger on presence of `package.json#catalog(s)` regardless of PM — rejected: ambiguous when both layouts somehow coexist, and adds a detection path the scan doesn't need. *Tooling note:* `bun outdated --filter '*'` natively lists catalog deps labeled `catalog:` / `catalog:<name>` per workspace, but exposes only Current/Update/Latest — no patch/minor/major band and no `minimumReleaseAge` — so it cannot replace the uniform `npm view` + level/cooldown candidate resolution; the catalog **source** is read directly (optionally via `bun pm pkg get`). (Spike: `research/bun-cli-spike.md`.)

**D2 — Catalog source shapes (Full scope).** Parse all four placements:

| Source in root `package.json` | `location` | Consumer ref |
| ----------------------------- | ---------- | ------------ |
| `catalog` (top-level)         | `catalog:default` | `catalog:` |
| `workspaces.catalog`          | `catalog:default` | `catalog:` |
| `catalogs.<name>` (top-level) | `catalog:<name>`  | `catalog:<name>` |
| `workspaces.catalogs.<name>`  | `catalog:<name>`  | `catalog:<name>` |

The previously reserved `catalog:<name>` location slot is now emitted. `sourceFile` is the repo-root-relative root `package.json`.

**D3 — Enriched `catalogEdits` carries the edit target explicitly.** `location` alone is insufficient (it's a consumer-facing label and can collide — see D4). Extend both the scan record and the apply `catalogEdits` element with a `catalogSource` descriptor: `{ sourceFile, manager: "pnpm"|"bun", field }` where `field` is `{ kind: "default" }` or `{ kind: "named", name }`, plus `underWorkspaces: boolean` for Bun. Apply uses `catalogSource` to locate the exact node. The pnpm element gains `catalogSource: { sourceFile: "pnpm-workspace.yaml", manager: "pnpm", field: { kind: "default" } }` — making today's implicit target explicit while staying behavior-identical.

**D4 — Location-string collision rule (pathological).** A repo defining both top-level `catalog` and `catalogs.default` maps two distinct Bun sources to `location: "catalog:default"`. They remain distinct via `catalogSource.field` (default vs named "default"), so apply is unambiguous; scan emits a warning `ambiguous default catalog: both 'catalog' and 'catalogs.default' present; treating as distinct sources`. Rare; not worth a richer location encoding.

**D5 — Read via `bun pm pkg get`; write via targeted in-place `Edit` (not parse→stringify, not `bun pm pkg set`).** Apply Step A2 generalizes to: select the source file from `catalogSource.sourceFile`. For Bun, READ the catalog maps with `bun pm pkg get catalog` / `bun pm pkg get catalogs` (clean native JSON, no hand-parsing). WRITE by locating the catalog block via `catalogSource.field` (+ `underWorkspaces`) and `Edit`-ing the exact `"name": "<version>"` token to the exact (range-stripped) target. *Rationale:* a full `JSON.parse` → `JSON.stringify` would reformat the whole file (indentation, key order, trailing newline), violating the minimal-diff contract the pnpm YAML path already honors. *Risk handled in D-risks:* a dep name appearing in two catalog blocks — scope the `Edit` match to the located block.

*Alternative evaluated — `bun pm pkg set catalogs.<name>.<pkg>=<version>` (rejected as the write mechanism).* It is native, formatting-preserving, leaves consumer refs untouched, and handles scoped names (`@types/node`). **But its key path is dot-delimited, so a package name containing a dot is silently mangled** — `bun pm pkg set catalogs.default.socket.io=4.7.0` writes `"socket": { "io": "4.7.0" }`, corrupting the entry, with no documented escape. In a flow whose original defect was a *silent* miss, a silent corruption edge is unacceptable, so `bun pm pkg set` is documented but NOT used to write. (Spike: `research/bun-cli-spike.md`.)

**D6 — Guard is a documented PM-agnostic invariant + cheap assertion.** Generalize "SHALL NOT mutate a `catalog:` consumer `package.json` (only `pnpm-workspace.yaml`)" → "(only the catalog source file: `pnpm-workspace.yaml` for pnpm, root `package.json` for Bun)". Apply additionally SHALL NOT emit a pinned version over any consumer value matching `/^catalog:/`, and SHALL NOT add such a dep to ncu `--filter`. At ncu@21.0.2 this is a no-op (ncu already skips), so zero behavior change today; it prevents a silent regression if a future ncu stops skipping `catalog:*`.

**D7 — Bun named-catalog warning removed; pnpm unchanged.** The scan's "named catalog detected but not yet supported" warning fires only on the pnpm path now. Bun named catalogs are first-class.

## Risks / Trade-offs

- **Future ncu changes `catalog:` handling** → D6 guard prevents consumer corruption; re-run the spike on any ncu bump advertising Bun catalog awareness (could even let ncu bump the source, retiring the in-place edit).
- **JSON edit reformats / reorders keys** → D5 targeted string `Edit` (not parse→stringify) keeps the diff minimal; matches the pnpm contract.
- **Same dep name in two catalog blocks** (e.g. `catalog.react` and `catalogs.testing.react`) → D5 scopes the `Edit` to the block resolved from `catalogSource.field`; if the version token is non-unique within the block, include neighboring lines in the match.
- **Legacy `experiments-plugin` spec duplicates scan/apply catalog requirements** → resolve in the specs phase (open question below); the authoritative deltas target `npm-update-scanning` / `npm-update-apply`.
- **Issue narrative vs verified behavior** → the proposal/specs document that root-cause #2 (drift) did not reproduce; reviewers seeing the issue's "corruption" framing must read the spike note.

## Migration Plan

N/A — skill-behavior change, no deploy/rollback. The Bun path is purely additive; the pnpm path is byte-identical (verifiable by diffing scan output / apply edits on a pnpm fixture before and after). The `catalogSource` field is additive to the apply spec; callers that omit it for pnpm get today's implicit default.

## Open Questions

- Does the legacy `experiments-plugin` spec (catalog requirements ~L172, 187–216, 294–296, 334) need a parallel MODIFIED delta, or is it superseded by `npm-update-scanning` / `npm-update-apply`? (memory: out-of-order sync risk.) Resolve before sync/archive.
- Confirm Bun's resolution when both top-level and `workspaces`-nested catalogs exist (precedence vs error). D2 assumes both are valid sources; verify against Bun if a fixture is available.
