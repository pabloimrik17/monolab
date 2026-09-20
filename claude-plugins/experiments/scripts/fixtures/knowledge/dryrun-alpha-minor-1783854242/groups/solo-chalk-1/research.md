## chalk (4.1.0 → 4.1.2)

Only a single call site exists in this codebase: `chalk.green(...)` in `src/index.js` (CommonJS `require("chalk")`). The `4.1.0 → 4.1.2` range carries no functional changes — the intermediate releases (4.1.1, 4.1.2) are documentation/README-only updates per the fetched GitHub release notes. Template-literal support for nested calls landed in 4.1.0, which is already the baseline version.

### Workarounds resolved

_no findings_

### Improvements applicable

_no findings_

The 4.1.1 and 4.1.2 releases are README-only; they introduce no new APIs, bug fixes, performance gains, or behavior changes that the single `chalk.green` usage in `src/index.js` could benefit from. This is a safe, non-actionable version bump — install and move on.
