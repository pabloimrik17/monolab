## Context

Monolab already has `claude-plugins/` with demo and expo-developer plugins. Need a new experiments plugin for staging beta features before promoting to production plugins.

Existing patterns to follow:
- Plugin structure from `claude-plugins/demo/` and `claude-plugins/expo-developer/`
- Marketplace registration in `.claude-plugin/marketplace.json`
- Workspace integration via `pnpm-workspace.yaml` (already includes `claude-plugins/*`)

## Goals / Non-Goals

**Goals:**
- Create experiments plugin following established patterns
- Single `/experiments:hello-experiments` command explaining purpose
- Register in marketplace for easy installation

**Non-Goals:**
- No actual experimental features yet (just the hello command)
- No skills or agents initially
- No TypeScript compilation needed

## Decisions

### 1. Plugin location: `claude-plugins/experiments/`

Follow existing convention. Alternatives: separate repo (rejected - want local development), packages/ (rejected - not an npm package).

### 2. Command-only plugin (no skills initially)

Start minimal with just `/experiments:hello-experiments`. Add skills as experiments are developed.

### 3. Package naming: `@m0n0lab/plugin-experiments`

Follow existing convention `@m0n0lab/plugin-{name}` with `private: true`.

## Risks / Trade-offs

- [Risk] Plugin grows with many experiments → Mitigation: Graduate stable features to proper plugins
- [Risk] Experiments break in production → Mitigation: Clear beta disclaimers in hello command
