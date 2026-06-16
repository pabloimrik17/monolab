# Spike — `ncu` behavior on Bun catalogs (issue #228 root-cause verification)

**Tool**: `npm-check-updates@21.0.2` via `bunx` (the version `apply-npm-updates` pins).
**Bun**: 1.3.10. **Date**: 2026-06-16.
**Goal**: verify issue #228 root-cause #2 — does `ncu --upgrade` rewrite a consumer `catalog:*` reference to a pinned version on a Bun repo?

## Fixture

`/tmp/bun-catalog-spike/package.json` (root):

```json
{
  "name": "bun-catalog-spike",
  "private": true,
  "version": "0.0.0",
  "workspaces": ["apps/*"],
  "catalog": { "lodash": "4.17.0" },
  "catalogs": {
    "default": { "chalk": "4.1.0", "eslint-plugin-storybook": "10.1.10" },
    "testing": { "semver": "7.5.0" }
  }
}
```

`apps/web/package.json` (consumer): deps referenced as `"lodash": "catalog:"`, `"chalk": "catalog:default"`, `"semver": "catalog:testing"`, `"eslint-plugin-storybook": "catalog:default"`. All have a newer patch available (`eslint-plugin-storybook@10.1.11` confirmed via `npm view`).

## Runs (flags mirror `apply-npm-updates` Step A1)

| # | Command | Result |
| - | ------- | ------ |
| 1 | `ncu -p bun --target patch --upgrade --removeRange --packageFile apps/web/package.json` | "All dependencies match the patch package versions" — **consumer refs unchanged** |
| 2 | same, **without** `-p` (auto-detect) | **consumer refs unchanged** — ncu skips `catalog:*` regardless of `-p` |
| 3 | `ncu -p bun … --packageFile package.json` (root, where catalogs live) | **"No dependencies"** — ncu never visits `catalog`/`catalogs` maps |
| 4 | repro-exact: `eslint-plugin-storybook: catalog:default`, `10.1.10`→`10.1.11` available, `-p bun --target patch` | **unchanged** — not pinned to `10.1.11` |

## Conclusion

- ncu@21.0.2 **does not** rewrite consumer `catalog:*` references (bare `catalog:`, `catalog:default`, or `catalog:<name>`), with or without `-p bun`. It treats the `catalog:` protocol as a non-version and skips it syntactically.
- ncu@21.0.2 **does not** read or bump Bun `catalog`/`catalogs` maps in the root `package.json`.
- Therefore issue #228 **root-cause #2 (consumer-ref rewrite → cross-consumer drift) does not reproduce** with the pinned tool. The corruption/drift the issue describes (apps/web pinned to `10.1.11` while the source stays `10.1.10`) requires ncu to rewrite a consumer ref, which it does not.
- The **confirmed** defect is **root-cause #1 alone**: `scan-npm-updates` reads only `pnpm-workspace.yaml`, so the Bun catalog source is invisible → the catalog dependency is **silently never updated** (a missed update, uniform across consumers — not divergence).

## Implications

- The fix is scan + apply of the Bun catalog **source** (`package.json#catalog` / `#catalogs`).
- The "never rewrite consumer `catalog:` refs" guard is **defense-in-depth** at the pinned ncu version — cheap to make explicit so a future ncu that stops skipping `catalog:*` cannot regress silently.
- Follow-up: re-run this spike on any future ncu bump that advertises Bun catalog awareness; it could turn the guard load-bearing or even bump the source itself.
