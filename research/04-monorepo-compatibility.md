# Research: Monorepo Compatibility for Claude Code Plugins

**Date:** 2026-01-06
**Status:** Complete

## Executive Summary

Claude Code plugins **can be developed in a monorepo** and this is actually a common pattern. However, they are **not npm packages** in the traditional sense - plugins are directory-based with manifest files rather than published npm packages. The key finding is that Claude Code uses a **marketplace distribution model** rather than npm registry publishing, which changes how monorepo strategies apply.

---

## 1. Plugin Installation Requirements

### How Claude Code Resolves Plugin Paths

Claude Code plugins use a **file-based distribution model**, not npm packages:

1. **Marketplace Installation**: Plugins are discovered via marketplaces (JSON catalogs)
2. **Directory Copying**: When installed, the **entire plugin directory is copied to a cache** at `~/.claude/plugins/cache/`
3. **No npm Resolution**: There is no `package.json` requirement for plugins themselves

**Installation commands:**
```bash
# Add a marketplace (catalog of plugins)
/plugin marketplace add owner/repo

# Install a specific plugin from marketplace
/plugin install plugin-name@marketplace-name

# Local development testing
claude --plugin-dir ./my-plugin
```

### npm Package Requirements

**Critical distinction**: Claude Code plugins are NOT npm packages. They:
- Do not require `package.json`
- Are not published to npm registry
- Use `plugin.json` manifest instead
- Are distributed as directories, not tarballs

The only npm requirement is for **Claude Code itself**: `npm install -g @anthropic-ai/claude-code`

### Local Development vs Published Packages

| Scenario | Method |
|----------|--------|
| Local development | `claude --plugin-dir ./path/to/plugin` |
| Team sharing | Git repository + marketplace.json |
| Public distribution | GitHub repo + marketplace registration |

---

## 2. Monorepo Considerations

### Can Plugins Be Developed in a Monorepo?

**Yes, absolutely.** This is actually the preferred pattern for:
- Organizations maintaining multiple plugins
- Related plugins sharing skills or utilities
- Plugin marketplaces (which are themselves monorepos)

### Recommended Monorepo Structure

```
my-monorepo/
├── package.json              # Root workspace config
├── pnpm-workspace.yaml       # Or npm/yarn workspaces
├── .claude-plugin/
│   └── marketplace.json      # Optional: makes repo a marketplace
├── plugins/
│   ├── plugin-one/
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json
│   │   ├── commands/
│   │   ├── agents/
│   │   └── skills/
│   └── plugin-two/
│       ├── .claude-plugin/
│       │   └── plugin.json
│       └── ...
├── packages/
│   └── shared-utilities/     # Node packages (if needed)
└── CLAUDE.md
```

### Critical Limitation: Path Traversal

**Plugins cannot reference files outside their copied directory.**

When Claude Code installs a plugin, it copies the plugin directory to cache. Paths like `../shared-utils` will NOT work because those files aren't copied.

**Workarounds:**

1. **Symlinks** (recommended for shared code):
   ```bash
   # Inside plugin directory
   ln -s ../../shared/utils ./shared-utils
   ```
   Symlinks ARE followed during the copy process.

2. **Copy parent directory** (marketplace approach):
   ```json
   {
     "name": "my-plugin",
     "source": "./",
     "commands": ["./plugins/my-plugin/commands/"],
     "strict": false
   }
   ```

3. **Inline shared code** in each plugin (duplication)

### Workspace Protocols (workspace:*, file:, etc.)

These protocols are **not directly applicable** to Claude Code plugins because plugins aren't npm packages. However, if your monorepo contains both:
- Regular npm packages
- Claude Code plugins

You can still use workspace protocols for your npm packages while plugins follow their own directory structure.

---

## 3. Case Studies

### superpowers-marketplace (obra/superpowers-marketplace)

**Architecture**: Metadata-only registry pointing to external repositories

```
superpowers-marketplace/
├── .claude-plugin/
│   └── marketplace.json      # Points to external repos
├── .claude/
│   └── settings.local.json
└── README.md
```

**Key pattern**: The marketplace is minimal - it's just a JSON catalog. Actual plugin code lives in separate repos:
- `obra/superpowers` - Core skills library
- `obra/elements-of-style` - Writing skills
- `obra/superpowers-developing-for-claude-code` - Meta-development toolkit

**Lesson**: You can separate the **distribution catalog** from **plugin code** repositories.

### anthropics/claude-code Official Plugins

**Architecture**: All-in-one monorepo with 13+ plugins

```
claude-code/
└── plugins/
    ├── README.md
    ├── agent-sdk-dev/
    ├── code-review/
    ├── commit-commands/
    ├── feature-dev/
    ├── plugin-dev/
    ├── pr-review-toolkit/
    ├── frontend-design/
    ├── hookify/
    ├── security-guidance/
    └── ...
```

**Key pattern**: Multiple plugins in single repo, each self-contained.

### kivilaid/plugin-marketplace

**Architecture**: Unified catalog referencing 87+ plugins from 10+ sources

**Key pattern**: Mix of local and external plugin sources in single marketplace.

---

## 4. Development Workflow

### Local Testing of Plugins

```bash
# Single plugin
claude --plugin-dir ./plugins/my-plugin

# Multiple plugins simultaneously
claude --plugin-dir ./plugins/plugin-one --plugin-dir ./plugins/plugin-two
```

**Important**: Changes require restarting Claude Code. There is no hot reload.

### Linking Plugins During Development

There is no `npm link` equivalent for Claude Code plugins. Options:

1. **Direct path loading**: `--plugin-dir` flag (recommended)
2. **Local marketplace**: Register your local repo as a marketplace
   ```bash
   /plugin marketplace add ./path/to/monorepo
   ```
3. **Symlink to user plugins directory**: Not officially supported

### Hot Reload Capabilities

**Native hot reload: NOT SUPPORTED**

Current limitations:
- Plugin changes require Claude Code restart
- Version bumps may be required for cache invalidation
- No watch mode for plugin development

**Workaround for MCP servers only:**
The `mcp-hot-reload` tool provides hot reload for MCP servers during development.

---

## 5. Publishing from Monorepo

### Publishing Multiple Packages

Since plugins aren't npm packages, "publishing" means:

1. **Push to Git**: Make your marketplace repo available
2. **Update marketplace.json**: Add/update plugin entries
3. **Share installation command**:
   ```bash
   /plugin marketplace add your-org/your-marketplace
   /plugin install plugin-name@your-marketplace
   ```

### Marketplace.json Configuration

```json
{
  "name": "company-tools",
  "owner": {
    "name": "DevTools Team",
    "email": "devtools@company.com"
  },
  "metadata": {
    "description": "Internal development tools",
    "version": "1.0.0",
    "pluginRoot": "./plugins"
  },
  "plugins": [
    {
      "name": "formatter",
      "source": "./plugins/formatter",
      "version": "2.1.0",
      "description": "Code formatting tools"
    },
    {
      "name": "external-tool",
      "source": {
        "source": "github",
        "repo": "company/separate-plugin"
      }
    }
  ]
}
```

### Version Synchronization

Each plugin maintains its own version in `plugin.json`:

```json
{
  "name": "my-plugin",
  "version": "1.2.3"
}
```

**Strategies:**
- **Independent versioning**: Each plugin versions separately
- **Lockstep versioning**: All plugins share version (requires tooling)
- **Changesets**: Use `@changesets/cli` for coordinated releases

---

## 6. Constraints and Limitations

### What CANNOT Be Done in a Monorepo

1. **Shared code via path traversal**: `../shared` paths don't work
2. **Dynamic imports from workspace packages**: Not applicable (not Node.js modules)
3. **npm/pnpm/yarn workspaces for plugins**: Plugins aren't npm packages

### When a Separate Repo IS Required

| Scenario | Recommendation |
|----------|----------------|
| Plugin with different access controls | Separate repo |
| Plugin sold/licensed separately | Separate repo |
| Plugin maintained by different team | Consider separate repo |
| Very large plugin with own CI needs | Consider separate repo |
| Plugins need to share code extensively | Same repo + symlinks |

### Technical Limitations

1. **No hot reload**: Must restart Claude Code for plugin changes
2. **Cache invalidation**: May need version bumps for updates
3. **Path isolation**: Each plugin must be self-contained after installation
4. **No npm ecosystem integration**: Can't use npm dependencies in plugin code directly (unless you bundle/compile)

### Plugin Component Location Rules

**CRITICAL**: Components MUST be at plugin root, NOT inside `.claude-plugin/`:

```
my-plugin/
├── .claude-plugin/
│   └── plugin.json      # ONLY this file goes here
├── commands/            # At root, NOT in .claude-plugin/
├── agents/              # At root, NOT in .claude-plugin/
├── skills/              # At root, NOT in .claude-plugin/
└── hooks/               # At root, NOT in .claude-plugin/
```

---

## 7. Recommendations for This Project

### Suggested Monorepo Structure

```
monolab/
├── package.json
├── pnpm-workspace.yaml
├── .claude-plugin/
│   └── marketplace.json          # Register as marketplace
├── plugins/                       # NEW: Plugin packages
│   ├── plugin-a/
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json
│   │   ├── commands/
│   │   ├── skills/
│   │   └── shared -> ../../shared-claude  # Symlink
│   └── plugin-b/
│       └── ...
├── shared-claude/                 # Shared plugin utilities
│   └── common-skills/
├── packages/                      # Existing npm packages
│   └── existing-packages/
└── CLAUDE.md
```

### Development Workflow

1. **Local testing**:
   ```bash
   claude --plugin-dir ./plugins/plugin-a
   ```

2. **Team testing**:
   ```bash
   /plugin marketplace add ./path/to/monolab
   /plugin install plugin-a@monolab
   ```

3. **Production**:
   ```bash
   /plugin marketplace add your-org/monolab
   ```

### Version Management

Use independent versioning per plugin. Consider a simple script:
```bash
# scripts/bump-plugin.sh
cd plugins/$1
jq '.version = "'$2'"' .claude-plugin/plugin.json > tmp && mv tmp .claude-plugin/plugin.json
```

---

## Sources

- [Create plugins - Claude Code Docs](https://code.claude.com/docs/en/plugins)
- [Discover and install plugins - Claude Code Docs](https://code.claude.com/docs/en/discover-plugins)
- [Create and distribute a plugin marketplace - Claude Code Docs](https://code.claude.com/docs/en/plugin-marketplaces)
- [Plugins reference - Claude Code Docs](https://code.claude.com/docs/en/plugins-reference)
- [GitHub - obra/superpowers-marketplace](https://github.com/obra/superpowers-marketplace)
- [GitHub - obra/superpowers](https://github.com/obra/superpowers)
- [GitHub - anthropics/claude-code](https://github.com/anthropics/claude-code)
- [pnpm Workspaces](https://pnpm.io/workspaces)
