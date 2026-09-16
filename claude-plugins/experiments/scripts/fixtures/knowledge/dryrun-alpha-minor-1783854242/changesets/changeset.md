# Changeset: dryrun-alpha (deep-minor)

## Applicable (1)

### [medium] zod — switch the import to the `zod/v4` subpath

- **File:** `/workspace/dryrun-alpha.deps-minor-2026-07-12/src/index.js`
- **Change:** Switch the top-level `require("zod")` to `require("zod/v4")`. The single `ConfigSchema` uses only `z.object`, `z.string`, and `z.number().int().min(0).default(3)` — all carry over unchanged to the v4 subpath (shipped inside `zod` since 3.25.0; installed version is 3.25.76). Low-risk, faster parsing / smaller footprint.

Before:

```js
const { z } = require("zod");
```

After:

```js
const { z } = require("zod/v4");
```

## Inapplicable (4)

- **[low] zod — new `.jwt()` / `.base64url()` / `.cidr()` string validators:** No current field needs them. The schema has only `name: z.string()` and `retries: z.number().int()`; neither is a JWT, base64url payload, or IP-range field. Explicitly flagged for future use.
- **[low] semver — compare fast-paths (7.7.3):** Passive — the optimization is internal to semver and is delivered by the version bump; the existing `semver.gte(process.versions.node, "22.0.0")` guard benefits with no code change.
- **[low] semver — internal cache replaced `lru-cache` (7.6.1 / 7.6.2):** Passive — a transitive-dependency footprint reduction realized simply by taking the bump; no source change.
- **[low] lodash — 4.18.0 security hardening:** Passive — delivered by the bump; none of the affected APIs (`_.unset` / `_.omit` / `_.template`) are used. The only lodash call is `_.groupBy`.

## Summary

Applicable: 1, Inapplicable: 4. Only the `zod/v4` subpath switch in `src/index.js` warrants a source edit now; the remaining four minor improvements are passive or future-use and are realized by the version bumps alone.
