## Context

Claude Code supports a plugin ecosystem where plugins can be distributed via Git-based marketplaces. Unlike npm packages, Claude Code plugins are directory-based with manifest files and are copied to a local cache upon installation. This design integrates a plugins area into the existing monolab monorepo architecture.

**Key constraints from Claude Code plugin system:**
- Plugins use `.claude-plugin/plugin.json` manifests (not package.json)
- Plugins are NOT npm packages - they're directory structures
- Marketplaces are JSON catalogs pointing to plugin sources
- Plugin components (commands/, skills/, agents/) MUST be at plugin root, not inside `.claude-plugin/`
- Plugins cannot reference files outside their directory (path isolation)

## Goals / Non-Goals

**Goals:**
- Establish a `claude-plugins/` area for developing Claude Code plugins
- Register monolab as a self-hosted marketplace
- Create a demo plugin demonstrating slash command functionality
- Integrate with existing pnpm workspace for tooling (linting, formatting)

**Non-Goals:**
- Publishing to Anthropic's official marketplace
- Creating MCP servers (out of scope for this change)
- Creating skills or subagents (demo focuses on commands only)
- npm/JSR publishing of plugins (plugins are Git-distributed)

## Decisions

### Decision 1: Directory Structure

Place `claude-plugins/` at monorepo root, parallel to `packages/` and `apps/`:

```
monolab/
├── apps/
├── packages/
├── claude-plugins/             # NEW: Claude Code plugins
│   └── demo/
│       ├── .claude-plugin/
│       │   └── plugin.json
│       └── commands/
│           └── hello-world.md
├── .claude-plugin/             # NEW: Marketplace manifest
│   └── marketplace.json
└── openspec/
```

**Rationale:** Follows existing monorepo convention of top-level directories for different artifact types. Keeps plugins separate from publishable npm packages. Named `claude-plugins/` to be explicit about contents.

### Decision 2: Marketplace Configuration

Use root-level `.claude-plugin/marketplace.json` with `pluginRoot` pointing to `claude-plugins/`:

```json
{
  "name": "monolab",
  "owner": {
    "name": "MonoLab Team",
    "email": "monolab@example.com"
  },
  "metadata": {
    "description": "Claude Code plugins from the MonoLab monorepo",
    "version": "1.0.0",
    "pluginRoot": "./claude-plugins"
  },
  "plugins": [
    {
      "name": "demo",
      "source": "./claude-plugins/demo",
      "version": "1.0.0",
      "description": "Demo plugin with hello-world command"
    }
  ]
}
```

**Rationale:** Centralizes marketplace metadata at repo root while plugins live in dedicated directory.

### Decision 3: Plugin Package Configuration

Include minimal `package.json` in each plugin for workspace tooling integration (linting, formatting), but mark as `"private": true` since plugins are not npm-published:

```json
{
  "name": "@m0n0lab/plugin-demo",
  "version": "1.0.0",
  "private": true,
  "description": "Demo Claude Code plugin"
}
```

**Rationale:** Enables pnpm workspace features (shared dependencies, consistent tooling) while making clear these are not publishable packages.

### Decision 4: Hello World Command Implementation

Create a markdown-based slash command that uses Claude's native randomization to select from 25 languages:

```markdown
---
description: Say hello world in a random language
---

# Hello World

Pick one language randomly from this list and respond with "Hello World" in that language:

1. English: Hello World
2. Spanish: Hola Mundo
3. French: Bonjour le Monde
... (25 total)

Only output the greeting, nothing else.
```

**Rationale:** Markdown commands are the simplest plugin component - no scripts needed. Claude handles the randomization naturally.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Plugin isolation prevents code sharing | Use symlinks if shared utilities needed in future |
| No hot reload during development | Use `claude --plugin-dir ./claude-plugins/demo` for testing |
| Version sync between marketplace.json and plugin.json | Document manual sync process; consider automation later |

## Migration Plan

No migration required - this is greenfield addition to the monorepo.

**Rollback:** Delete `claude-plugins/` directory and `.claude-plugin/` folder.

## Open Questions

1. Should plugins have their own Nx project.json for task running? (Initial answer: No, keep simple)
2. Should we add CI validation for plugin manifests? (Deferred to future change)
