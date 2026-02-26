# Claude Code Plugins

This directory contains Claude Code plugins developed in the MonoLab monorepo.

## Structure

Each plugin is a self-contained directory:

```text
claude-plugins/
└── <plugin-name>/
    ├── .claude-plugin/
    │   └── plugin.json      # Plugin manifest
    ├── commands/            # Slash commands (markdown files)
    ├── skills/              # Skills (markdown files)
    ├── agents/              # Subagents (markdown files)
    └── package.json         # Workspace integration (private)
```

## Creating a Plugin

1. Create directory: `mkdir -p claude-plugins/<name>/.claude-plugin`
2. Add `plugin.json` manifest with name, version, description
3. Add commands/skills/agents as markdown files
4. Add `package.json` with `"private": true` for workspace tooling
5. Register in `/.claude-plugin/marketplace.json`

## Testing Locally

```bash
claude --plugin-dir ./claude-plugins/<plugin-name>
```

## Installing from Marketplace

```bash
# Add monolab as a marketplace
/plugin marketplace add pabloimrik17/monolab

# Install a plugin
/plugin install <plugin-name>@monolab
```
