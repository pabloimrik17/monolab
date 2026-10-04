## lodash (4.17.19 → 4.18.1)

Fetched changelogs: 4.18.0, 4.18.1 (via github_releases). Versions 4.17.19/4.17.20/4.17.21/4.17.23 had no changelog source. Codebase usage is a single call site: `_.groupBy` in `src/index.js` (only lodash consumer in the repo).

### Workarounds resolved

_no findings_

No hand-rolled guards or defensive wrappers around lodash exist in the codebase (only `_.groupBy` is called), so there is nothing that the 4.18.0 security fixes or the 4.18.1 modular-build bug fix render obsolete.

### Improvements applicable

- Passive security hardening, no code change required — 4.18.0 patches prototype pollution in `_.unset`/`_.omit` (GHSA-f23m-r3pf-42rh) and code injection via `_.template` `imports` keys (GHSA-r5fr-rjxr-66jc / CVE-2026-4800); the bump delivers these regardless of usage. None of the affected APIs (`unset`, `omit`, `template`, `fromPairs`) appear in `src/**`, so the only actionable improvement is taking the version bump itself.
- Behavior-change awareness for future `_.unset`/`_.omit` use — post-4.18.0, `constructor`/`prototype` are blocked as non-terminal path keys and previously-succeeding deletions now return `false`; note in case those functions are introduced later (currently not present in `src/**`).
- No changelog entry touches `_.groupBy`, the repo's sole lodash call site (`src/index.js`), so no functional migration or opportunity applies to existing code — the bump is safe to adopt as-is.
