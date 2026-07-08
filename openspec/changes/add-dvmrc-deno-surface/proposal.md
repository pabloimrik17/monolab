## Why

The engines-update tooling (`/experiments:npm-update-engines`, `/experiments:*-deep-engines`, `commander-update-orchestrator` at `level=engines`) reads runtime version pins via `detect-toolchain-surfaces` and rewrites them via `apply-engine-bumps`. monolab CI now reads Deno's version from a root `.dvmrc` (via `denoland/setup-deno`'s `deno-version-file`) so the workflow no longer hardcodes `deno-version`. Because `detect-toolchain-surfaces` doesn't recognize `.dvmrc` — Deno's canonical version file, the `.nvmrc` analog — future `engines` runs won't detect or bump it, so it silently **drifts** out of sync with `engines.deno` / `devEngines.runtime`.

## What Changes

- **`detect-toolchain-surfaces`**: add a matcher row for a root `.dvmrc` as a **deno** `runtime` whole-file surface (locus `file`), parsed/aligned the same way `.nvmrc` is for Node (trim whitespace, preserve a leading `v`), classified `runtime` unconditionally.
- **`detect-toolchain-surfaces`**: recognize `denoland/setup-deno`'s `with.deno-version-file` as a **pointer** to the referenced file — not an inline version surface, and not an `unknownSurface`. The version lives in the pointed-to file (`.dvmrc`), which is already scanned as its own surface, so the CI step must not be double-counted.
- **`apply-engine-bumps`**: rewrite the `.dvmrc` whole-file version token on a Deno bump, preserving any leading `v`, same surgical treatment as `.nvmrc`/`.node-version`.
- **No change** to `.tool-versions`/mise `deno` parsing — already covered by the existing matcher.
- Scope: **root `.dvmrc` only**. Non-breaking (purely additive surface coverage).

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `engine-surface-scanning`: extend the comprehensive surface-matcher coverage to recognize a root `.dvmrc` as a deno runtime surface, and to treat `deno-version-file` in a `denoland/setup-deno` step as a file pointer rather than a version or unknown surface.
- `engine-update-apply`: extend runtime-surface rewriting to cover the `.dvmrc` whole-file version token (preserving a leading `v`) on a Deno bump.

## Impact

- **Files**: `claude-plugins/experiments/skills/detect-toolchain-surfaces/SKILL.md`, `claude-plugins/experiments/skills/apply-engine-bumps/SKILL.md` (documentation-only skill definitions).
- **Consuming commands** (behavior extended, no interface change): `/experiments:npm-update-engines`, `/experiments:npm-update-deep-engines`, `/experiments:commander-update-engines`, `/experiments:commander-update-deep-engines`.
- **No effect** on package-level update commands (`npm-update-{patch,minor,major}` and deep variants) — Deno-as-runtime is not an npm dependency and lives only in the engines track.
- **monolab itself**: the root `.dvmrc` (`2.9.0`) becomes a tracked Deno runtime surface, aligned with `engines.deno` / `devEngines.runtime` (both `2.9.0`); the `deno-version-file` CI step is correctly read as a pointer, so no false intra-repo misalignment is reported.
