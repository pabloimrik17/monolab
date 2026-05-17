# Rename InvestLab Design

## Context

Current project names `wealth-react` and `wealth-tracker-core` are generic and don't reflect the app's focus on investment portfolio tracking and active trading. Renaming to InvestLab aligns with the monorepo naming convention (MonoLab -> InvestLab) and clarifies purpose.

## Goals / Non-Goals

**Goals:**
- Rename all workspace references consistently (directories, package.json names, nx project names, imports)

**Non-Goals:**
- No functional changes, no new features, no dependency changes

## Decisions

### 1. New names follow monorepo pattern

| Old | New |
|-----|-----|
| `apps/wealth-react` | `apps/investlab` |
| `packages/wealth-tracker-core` | `packages/investlab-core` |
| `@m0n0lab/wealth-react` | `@m0n0lab/investlab` |
| `@m0n0lab/wealth-tracker-core` | `@m0n0lab/investlab-core` |

**Why**: "InvestLab" mirrors "MonoLab" naming. Clearly communicates investment domain. Short enough for imports.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Broken imports if references missed | Grep for `wealth-react`, `wealth-tracker-core` after rename; verify builds pass |
| Git history harder to trace across rename | `git log --follow` handles file renames; single commit keeps it clean |
