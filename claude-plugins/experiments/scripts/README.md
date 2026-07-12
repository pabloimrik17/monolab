# Deep-update pipeline scripts

Deterministic executables backing the deep-update command family
(`/experiments:npm-update-deep-*`, `/experiments:commander-update-deep-*`).
Every mechanically-checkable pipeline step lives here instead of in prose,
so it either runs or errors — it cannot be skipped under context pressure.

Zero dependencies; Node >= 22. All entry points are invoked as
`node ${CLAUDE_PLUGIN_ROOT}/scripts/<name>.mjs …`.

| Script                       | Role                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fetch-changelog.mjs`        | Changelog retrieval per package/engine over a version range. Preserves the `experiments:npm-changelog` cache contract (`~/.claude/changelogs/`): Strategy A raw CHANGELOG (monorepo cascade), Strategy B GitHub Releases (tag-format probes), Strategy C unpkg, SHA256 write-verify. Structured per-version errors; exit 0 all verified, 1 some failed (recorded), 2 structural. |
| `assemble-chronology.mjs`    | Builds the dossier's `## Changelogs` section from the on-disk cache (no network, no agent re-typing): alphabetical package blocks, links line from cached metadata, verbatim bodies for the half-open span `(from, to]` in `<details>` wrappers, `_no changelog available_` sentinel.                                                                                            |
| `check-dossier.mjs`          | Layer-1 dossier compliance check: cache coverage (entry or recorded error per bump-set package), chronology block per package, required H2 set per level/mode, sentinels on empty sections. Exit non-zero on violation with a JSON violations list.                                                                                                                              |
| `semver-max-wins.mjs`        | Cross-project version alignment: dedup packages across per-project ScanResults, max-wins `effectiveTarget`, most-common representative `currentVersion`.                                                                                                                                                                                                                         |
| `validate-subset.mjs`        | Deterministic `pick-subset` parsing: exact-match bump matches, substring-match improvement matches (matched tokens = items to apply), unmatched tokens flagged for re-prompt.                                                                                                                                                                                                    |
| `check-source-untouched.mjs` | Pre-gate check for the per-project apply gate: `snapshot` records HEAD + `git status --porcelain` + dirty-file hashes before the apply teammate spawns; `check` verifies nothing changed during teammate turn 1 (recon must not edit).                                                                                                                                           |

## Tests

```bash
pnpm --filter @m0n0lab/plugin-experiments run test:unit
```

Vitest (`vitest run` via `test:unit`), offline fixtures; `*.test.mjs`
files sit adjacent to their sources. `lib/existing-cache.test.mjs`
additionally validates the readers against the real `~/.claude/changelogs`
cache and skips when absent (CI).

## Permission allowlist

The scripts make their own network/tooling calls in-process (`npm view`,
`gh api` / `api.github.com`, `raw.githubusercontent.com`, `unpkg.com`,
`nodejs.org`). To keep a single-launch deep-update run free of mid-run
permission prompts, merge `permissions-allowlist.json` into your
`~/.claude/settings.json` (user scope — the commander flows visit many
projects). Bash permission rules are prefix matches: the shipped rule is
`Bash(node:*)`; tighten it to an absolute plugin-path prefix if you want a
narrower grant. If your sandbox filters network egress, also allow the
domains listed in the snippet.
