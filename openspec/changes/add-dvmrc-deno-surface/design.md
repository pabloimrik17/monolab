## Context

The engines track of the `experiments` update tooling detects runtime/PM version loci (`detect-toolchain-surfaces`) and rewrites them (`apply-engine-bumps`). Both are documentation-only SKILL.md definitions — there is no compiled matcher; the "matcher set" is a table plus prose the skill follows.

Today the matcher recognizes `.nvmrc`/`.node-version` (Node) but not `.dvmrc` (Deno). Deno-as-runtime is otherwise covered via `engines.deno`, `devEngines.runtime`, `.tool-versions`/mise, Dockerfiles, and `denoland/setup-deno` `deno-version`. monolab (PR #252/#253) moved its CI Deno pin out of the workflow and into a root `.dvmrc`, read via `denoland/setup-deno`'s `deno-version-file` input. So the canonical Deno version now lives in a file the skill can't see, and CI references it by pointer rather than inline value.

Current monolab state (all `2.9.0`, aligned): `engines.deno`, `devEngines.runtime[deno]`, root `.dvmrc`; CI step uses `deno-version-file: .dvmrc`.

## Goals / Non-Goals

**Goals:**
- `detect-toolchain-surfaces` recognizes a root `.dvmrc` as a Deno `runtime` whole-file surface, treated like `.nvmrc`.
- `detect-toolchain-surfaces` treats `denoland/setup-deno` `with.deno-version-file` as a pointer to the referenced file — not an inline surface, not an `unknownSurface`.
- `apply-engine-bumps` rewrites the `.dvmrc` whole-file token on a Deno bump, preserving a leading `v`.
- No regression to existing Deno coverage (`.tool-versions`/mise already handled).

**Non-Goals:**
- Scanning `.dvmrc` outside the repo root.
- Resolving `deno-version-file` values other than a plain file path (ranges, globs, matrix expressions).
- Any change to the package-level update tracks (`patch`/`minor`/`major`) — Deno runtime is not an npm dependency.
- Migrating or rewriting CI provider config beyond the version token.

## Decisions

**D1 — `.dvmrc` is a whole-file surface, mirror of `.nvmrc`.** Read the whole-file token (trim whitespace, preserve a leading `v`), locus `file`, classified `runtime` unconditionally like every other non-`package.json` runtime file. Rationale: `.dvmrc` is the exact Deno analog of `.nvmrc`; reusing that treatment keeps the matcher uniform and the apply-side rewrite trivial. Alternative considered: a bespoke Deno-only surface type — rejected as needless divergence.

**D2 — Root-only.** Scan `.dvmrc` once at the repo root, as `deno-version-file` in CI references and as the tool's convention expect. Rationale: matches the issue scope and `denoland/setup-deno` usage; no known nested `.dvmrc` case in monolab. Alternative: scan any path — deferred, no use case and widens false-positive surface.

**D3 — `deno-version-file` is a pointer, not a surface.** When a `denoland/setup-deno` step sets `with.deno-version-file`, do not treat the step as an inline version surface, and do not push it to `unknownSurfaces`; the version is surfaced through the file it points at (`.dvmrc`). Rationale: prevents double-counting (which would trip the intra-repo misalignment flag) and prevents a false `unknownSurface` for a perfectly-understood step. Alternative: record the step and dedupe later — rejected; pointer semantics are cleaner at detection time.

**D4 — Documentation-only edits, no `.tool-versions` change.** Both edits are to SKILL.md prose/tables. The `.tool-versions`/mise `deno` line the issue flagged as "optional" is already covered (matcher rows + engine-name recognition), so no change there.

## Risks / Trade-offs

- **Prose-based matcher drift** → the "spec" is prose the skill follows; the delta specs' scenarios (`.dvmrc` detected, `deno-version-file` pointer, `.dvmrc` rewritten) act as the acceptance checks that keep SKILL.md honest.
- **`deno-version-file` with a non-`.dvmrc` path** → the pointer rule is generic (points at whatever file is named); only the file basename convention (`.dvmrc`) is privileged for standalone detection. A `deno-version-file` naming a non-standard file is still followed as a pointer, so no surface is lost.
- **Leading `v` convention mismatch** → mitigated by preserving whatever prefix the existing file used (monolab's `.dvmrc` has none: `2.9.0`).

## Migration Plan

None — additive surface coverage. No consumer interface changes; the four engines commands pick up the new surface automatically. Rollback = revert the two SKILL.md edits.

## Open Questions

_None._
