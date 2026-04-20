# Spike 1.2 — `ncu --upgrade --packageFile pnpm-workspace.yaml` support

**Tool**: `npm-check-updates@21.0.2` via `pnpm dlx`.
**Date**: 2026-04-20.
**Decision verified**: Decision 4 (keep in-memory edit path for `catalog:` entries).

## Fixture

`/tmp/ncu-spike/catalog/`:

`pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
catalog:
  prettier: 3.4.0
  postcss-import: 16.1.0
```

`package.json`:

```json
{
  "name": "ncu-spike-catalog",
  "private": true,
  "version": "0.0.0"
}
```

Both catalog entries are visibly out of date (`prettier@3.4.0` → `3.4.2` and `postcss-import@16.1.0` → `16.1.1` as of the spike run).

## Run A — explicit `--packageFile pnpm-workspace.yaml`

```
pnpm dlx npm-check-updates@21.0.2 \
  --target patch --upgrade \
  --packageFile ./pnpm-workspace.yaml
```

Stdout:

```
Missing or invalid ./pnpm-workspace.yaml
```

Nothing was rewritten. Diff on `pnpm-workspace.yaml`: empty.

## Run B — auto-detect (no `--packageFile`) from the fixture root

```
pnpm dlx npm-check-updates@21.0.2 --target patch --upgrade
```

Stdout:

```
Upgrading /private/tmp/ncu-spike/catalog/package.json

No dependencies.
```

ncu auto-targeted the empty `package.json`; `pnpm-workspace.yaml#catalog` was not visited. Diff on `pnpm-workspace.yaml`: empty.

## Conclusion

- ncu 21.0.2 **does not** rewrite `pnpm-workspace.yaml` catalog entries with `--upgrade`, whether the file is passed explicitly or left to auto-detection.
- Explicit `--packageFile pnpm-workspace.yaml` is rejected as "Missing or invalid" (the parser expects npm manifest shape).
- **Decision 4 stands**: the `/experiments:npm-update-patch` command keeps its in-memory edit path for catalog entries.

Follow-up: revisit on any ncu minor/major release that advertises catalog support. The seam in the command lives in Step 6's catalog branch; swapping it for an ncu invocation is a one-file change.
