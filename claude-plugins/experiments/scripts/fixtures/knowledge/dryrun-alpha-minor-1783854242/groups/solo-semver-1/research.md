## semver (7.5.4 → 7.8.5)

### Workarounds resolved

_no findings_

The only consumer is a single `semver.gte(...)` node-version guard in `src/index.js`. No code shims, custom range parsing, coerce fallbacks, or version-manipulation helpers exist that these releases would let us delete.

### Improvements applicable

- Transparent compare fast-paths (7.7.3, "faster paths for compare") directly speed up the existing `semver.gte` call in `src/index.js` — pure runtime win, no code change needed.
- lru-cache dependency was removed in favor of an internal cache (7.6.1 / 7.6.2), shrinking the installed transitive dependency footprint of this project — benefit is realized simply by taking the bump.
- Range parsing/formatting optimizations (7.6.3) improve any future range-based checks; only relevant if the node-version guard is ever widened to a range expression.
- New APIs are now available but not applicable to current usage: `truncate` (7.8.0), the `release` inc type and stricter `inc()` identifier validation (7.7.0), and coerce preserving prerelease/build parts (7.6.0). No opportunity to adopt them given the sole `gte` call — noted only so a future version-handling feature knows they exist.
