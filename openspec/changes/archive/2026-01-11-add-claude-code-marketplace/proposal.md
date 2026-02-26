## Why

MonoLab currently hosts utility packages for the JavaScript/TypeScript ecosystem. With Claude Code becoming a central development tool, there's an opportunity to extend the monorepo to host Claude Code plugins that enhance AI-assisted development workflows. This creates a self-contained marketplace that teams can add via URL without requiring submission to Anthropic's official marketplace.

## What Changes

- **NEW** `claude-plugins/` directory at monorepo root (parallel to `packages/` and `apps/`)
- **NEW** `.claude-plugin/marketplace.json` at repo root to register monolab as a Claude Code marketplace
- **NEW** `demo` plugin with a `hello-world` slash command that outputs "Hello World" in one of 25 random languages
- **UPDATE** `pnpm-workspace.yaml` to include `claude-plugins/*` workspace pattern
- **UPDATE** Root `tsconfig.json` to add references for plugin packages (if applicable)

## Impact

- **Affected specs**: None (new capability)
- **Affected code**:
  - Root configuration files (`pnpm-workspace.yaml`, `tsconfig.json`)
  - New directory structure at `claude-plugins/`
  - New marketplace manifest at `.claude-plugin/marketplace.json`

## Distribution Model

Users install plugins by adding the monolab repository as a marketplace:

```bash
# Add marketplace
/plugin marketplace add pabloimrrik17/monolab

# Install specific plugin
/plugin install demo@monolab
```

This approach:
- Does NOT require submission to Anthropic's official marketplace
- Allows full control over plugin versioning and distribution
- Enables team sharing via Git repository URL
- Supports both public and private repository distribution
