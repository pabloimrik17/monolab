# Mutation Testing Design

## Context

MonoLab has strong quality infrastructure (Vitest, Codecov, CI with affected execution) but lacks validation that tests actually catch bugs. Code coverage can reach 100% with weak assertions. Mutation testing introduces deliberate bugs to verify tests fail appropriately.

**Constraint:** CI must remain fast. Mutation testing is inherently slower than unit tests.

## Goals / Non-Goals

**Goals:**
- Validate test quality beyond coverage
- Integrate seamlessly with existing Nx/Vitest workflow
- Minimize CI execution time with incremental mode and strategic execution
- Track mutation scores per package with centralized dashboard

**Non-Goals:**
- Running mutation tests on every PR (too slow)
- Achieving 100% mutation score immediately (gradual improvement)

## Decisions

### Decision 1: Shared Base Configuration with Per-Package Overrides

**What:** `stryker.config.base.ts` at root extended by each package's `stryker.config.ts`.

**Why:**
- Consistency: Common settings (testRunner, reporters, incremental) managed centrally
- Flexibility: Package-specific thresholds (utilities need higher scores than React packages)
- Maintainability: Single source of truth for most configuration

**Alternative considered:** Fully independent configs per package
- **Rejected:** Too much duplication, inconsistency risk, harder to maintain

### Decision 2: Run Only on Main/Develop Branches

**What:** Mutation testing executes only on push to main/develop, skipped on PRs.

**Why:**
- Fast PR feedback: Developers get quick CI results (<5 min)
- Adequate validation: Tests still run before production deployment
- Cost efficiency: Reduces CI minutes consumed

**Alternative considered:** Run on all PRs
- **Rejected:** Significantly slower CI (mutation testing takes 10-30 min), higher costs

**Alternative considered:** Run on schedule (nightly)
- **Rejected:** Delayed feedback, harder to trace issues to specific commits

### Decision 3: Incremental Mode with Multi-Level Cache Strategy

**What:** Enable Stryker incremental mode, cache `stryker-incremental.json` with fallback strategy.

**Cache key structure:**
```
stryker-{OS}-{branch}-{pnpm-lock-hash}
```

**Fallback order:**
1. Same branch, different dependencies
2. develop branch (base for features)
3. Any branch (last resort)

**Why:**
- **Same branch priority:** Most similar code, maximum cache reuse
- **develop fallback:** Features branch from develop, code is closer than main
- **Generic fallback:** Better than nothing, Stryker detects differences anyway
- **Exclude main from fallback:** develop is always more recent than main in this workflow

**Alternative considered:** No cache
- **Rejected:** First run takes 20-30 min per package, unacceptable

**Alternative considered:** Cache only on exact match
- **Rejected:** Cache miss on every dependency update, losing most benefits

### Decision 4: Graduated Thresholds by Package Type

**What:**

| Package Type | High | Low | Break | Rationale |
|-------------|------|-----|-------|-----------|
| Utilities (is-even, is-odd) | 90% | 75% | 75% | Simple pure functions, easy to test thoroughly |
| React (react-hooks, react-clean) | 80% | 65% | 60% | Complex with lifecycle/state, more tolerance |
| Config (ts-configs) | 70% | 50% | 50% | Configuration-heavy, less applicable |

**Why:**
- **Realistic expectations:** Different code complexity requires different standards
- **Non-blocking:** Start below current scores, increase gradually
- **Motivational:** High thresholds encourage improvement without blocking progress

**Alternative considered:** Same threshold for all packages
- **Rejected:** Either too lenient for simple code or too strict for complex code

### Decision 5: Stryker Dashboard with Module Separation

**What:** Configure dashboard with per-package module identifiers, aggregate into project view.

**Configuration:**
- Base: `project: "github.com/pabloimrik17/monolab"`, `version: $BRANCH`
- Per-package: `module: "is-odd"`, `module: "react-hooks"`, etc.

**Why:**
- **Per-package visibility:** Track mutation scores independently for each package
- **Trend analysis:** Historical mutation score tracking per package and overall
- **Badge support:** Global badge + per-module badges for READMEs
- **Monorepo-native:** Stryker dashboard designed for this use case

**Alternative considered:** Single combined report
- **Rejected:** Loses granularity, can't track individual package quality

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| CI execution time increases | Run only on main/develop; incremental mode; cache strategy |
| False positives in mutations | Configure ignore patterns; tune per package; monitor trends |
| Low initial scores block builds | Set thresholds below current scores; increase gradually |
| Cache invalidation issues | Multiple fallbacks; worst case is full rebuild (slow but functional) |
| Dashboard API key management | Store in GitHub secrets; rotate if compromised |

## Migration Plan

**Phase 1:** Install dependencies, create configurations, test locally (1-2 days)
**Phase 2:** Integrate with Nx targets, test affected execution (1 day)
**Phase 3:** Add CI steps with cache, test on develop (1 day)
**Phase 4:** Configure dashboard, add badges, update docs (0.5-1 day)

**Rollback:** Remove CI step, keep local config for manual runs

## Open Questions

None - design approved.
