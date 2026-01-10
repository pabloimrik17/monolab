# Claude Code Marketplace and Plugin Publishing Research

**Date**: January 2026
**Status**: Research Complete

---

## Table of Contents

1. [Official Marketplace](#1-official-marketplace)
2. [Publishing Process](#2-publishing-process)
3. [Distribution Models](#3-distribution-models)
4. [Existing Marketplaces](#4-existing-marketplaces)
5. [Installation Methods](#5-installation-methods)
6. [Plugin Manifest Schema](#6-plugin-manifest-schema)
7. [Enterprise Distribution](#7-enterprise-distribution)
8. [Sources](#sources)

---

## 1. Official Marketplace

### Is There an Official Claude Code Marketplace?

**Yes.** Anthropic maintains an official marketplace called `claude-plugins-official`, which is automatically available when you start Claude Code (version 1.0.33+).

- **Repository**: https://github.com/anthropics/claude-plugins-official
- **Plugin Count**: 29 plugins (12 internal by Anthropic, 17 external from partners)
- **Access**: Automatic - no registration required

### How Plugin Discovery Works

Plugin discovery operates through a **tabbed interface** within Claude Code:

1. Run `/plugin` command
2. Navigate to the **Discover** tab (use Tab/Shift+Tab to cycle)
3. Browse plugins from all registered marketplaces
4. Press Enter on a plugin to see installation options

### Registry Mechanisms

Claude Code uses a **Git-based registry system**, not npm or a custom registry:

- **Primary**: Git repositories (GitHub, GitLab, or any git host)
- **Format**: JSON manifest files (`.claude-plugin/marketplace.json`)
- **Sources Supported**:
  - GitHub repositories (`owner/repo`)
  - Git URLs (HTTPS or SSH)
  - Local filesystem paths
  - Direct JSON URLs

---

## 2. Publishing Process

### How to Publish a Plugin

#### Option 1: Submit to Official Marketplace

1. Fork https://github.com/anthropics/claude-plugins-official
2. Add your plugin to `/external_plugins/` directory
3. Follow plugin structure requirements
4. Submit a pull request
5. Pass Anthropic's quality and security review

#### Option 2: Create Your Own Marketplace

1. **Create plugin structure**:
   ```
   my-plugin/
   ├── .claude-plugin/
   │   └── plugin.json          # Required manifest
   ├── commands/                 # Slash commands
   ├── agents/                   # Subagents
   ├── skills/                   # Agent Skills
   └── README.md
   ```

2. **Create marketplace manifest** (`.claude-plugin/marketplace.json`):
   ```json
   {
     "name": "my-marketplace",
     "owner": {
       "name": "Your Name",
       "email": "you@example.com"
     },
     "plugins": [
       {
         "name": "my-plugin",
         "source": "./plugins/my-plugin",
         "description": "What it does",
         "version": "1.0.0"
       }
     ]
   }
   ```

3. **Host on GitHub** (or other git host)

4. **Users install via**:
   ```bash
   /plugin marketplace add your-username/your-repo
   /plugin install my-plugin@my-marketplace
   ```

### Required Metadata and Configuration

#### Plugin Manifest (`plugin.json`) - Required Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | **Yes** | Unique identifier (kebab-case) |
| `version` | string | No | Semantic version (e.g., "1.0.0") |
| `description` | string | No | Brief purpose description |
| `author` | object | No | `{name, email, url}` |
| `homepage` | string | No | Documentation URL |
| `repository` | string | No | Source code URL |
| `license` | string | No | SPDX identifier (MIT, Apache-2.0) |
| `keywords` | array | No | Discovery tags |

### Versioning and Updates

- **Versioning**: Semantic versioning (MAJOR.MINOR.PATCH)
- **Auto-updates**:
  - Official Anthropic marketplaces: auto-update enabled by default
  - Third-party marketplaces: auto-update disabled by default
  - Per-marketplace toggle available in `/plugin > Marketplaces`
- **Manual updates**: `/plugin marketplace update marketplace-name`

---

## 3. Distribution Models

### npm Packages

Claude Code itself is distributed via npm (`@anthropic-ai/claude-code`), but **plugins are NOT distributed via npm**. Instead:

- Plugins use Git-based distribution
- Community tools like `npx claude-plugins` wrap the installation process
- No `claude-plugin-` prefix convention (unlike npm packages)

### GitHub Releases

**Primary distribution method**:
```bash
# From GitHub
/plugin marketplace add owner/repo-name

# From specific branch/tag
/plugin marketplace add owner/repo-name#v1.0.0
```

### Direct Installation

Plugins can be installed from multiple sources:
```bash
# GitHub
/plugin marketplace add anthropics/claude-plugins-official

# GitLab (HTTPS)
/plugin marketplace add https://gitlab.com/company/plugins.git

# SSH
/plugin marketplace add git@github.com:company/plugins.git

# Local filesystem
/plugin marketplace add ./my-local-marketplace

# Direct JSON URL
/plugin marketplace add https://example.com/marketplace.json
```

### Private/Enterprise Distribution

**Team Distribution via settings.json**:
```json
{
  "extraKnownMarketplaces": {
    "company-tools": {
      "source": {
        "source": "github",
        "repo": "your-org/claude-plugins"
      }
    }
  },
  "enabledPlugins": {
    "code-formatter@company-tools": true
  }
}
```

**Enterprise Restrictions** (`strictKnownMarketplaces`):
```json
{
  "strictKnownMarketplaces": [
    {
      "source": "github",
      "repo": "acme-corp/approved-plugins"
    }
  ]
}
```

---

## 4. Existing Marketplaces

### Official Anthropic Marketplace

- **Name**: `claude-plugins-official`
- **URL**: https://github.com/anthropics/claude-plugins-official
- **Structure**:
  ```
  claude-plugins-official/
  ├── .claude-plugin/
  │   └── marketplace.json
  ├── plugins/              # Internal (Anthropic) plugins
  └── external_plugins/     # Third-party plugins
  ```

### superpowers-marketplace

- **URL**: https://github.com/obra/superpowers-marketplace
- **Description**: Curated collection of workflow-enhancing plugins
- **Stars**: 282+
- **Featured Plugins**:
  - **Superpowers** - Core skills library with TDD, debugging, collaboration
  - **Elements of Style** - Writing guidance based on Strunk's rules
  - **Superpowers: Developing for Claude Code** - Plugin development resources

**Installation**:
```bash
/plugin marketplace add obra/superpowers-marketplace
/plugin install superpowers@superpowers-marketplace
```

### Community Registries

#### claude-plugins.dev

- **URL**: https://claude-plugins.dev/
- **Stats**: ~9,595 plugins, ~52,128 agent skills indexed
- **How it works**: Automatically discovers and indexes public Claude Code plugins on GitHub
- **CLI Tools**:
  - `claude-plugins` - Plugin management
  - `skills-installer` - Agent skills management

---

## 5. Installation Methods

### Primary Installation (Within Claude Code)

```bash
# Add a marketplace
/plugin marketplace add owner/repo

# Browse available plugins
/plugin  # Then navigate to Discover tab

# Install a specific plugin
/plugin install plugin-name@marketplace-name

# Install with scope
/plugin install plugin-name@marketplace-name --scope project
```

### Installation Scopes

| Scope | Settings File | Use Case |
|-------|---------------|----------|
| `user` | `~/.claude/settings.json` | Personal plugins (default) |
| `project` | `.claude/settings.json` | Team plugins via version control |
| `local` | `.claude/settings.local.json` | Project-specific, gitignored |
| `managed` | `managed-settings.json` | Enterprise-managed (read-only) |

### Dependency Management

- Plugins are **self-contained** - no external dependency system
- MCP servers can have their own dependencies (Node modules, Python packages)
- Plugin caching: Plugins copied to `~/.claude/plugins/cache/`
- Cannot reference files outside plugin root (security restriction)

### Auto-Updates

```bash
# Check auto-update status
claude doctor

# Marketplace auto-update toggle
/plugin  # Navigate to Marketplaces tab

# Disable all auto-updates
export DISABLE_AUTOUPDATER=1
```

---

## 6. Plugin Manifest Schema

### Complete plugin.json Example

```json
{
  "name": "enterprise-tools",
  "version": "2.1.0",
  "description": "Enterprise workflow automation tools",
  "author": {
    "name": "Enterprise Team",
    "email": "team@example.com",
    "url": "https://github.com/enterprise-team"
  },
  "homepage": "https://docs.example.com/plugins/enterprise-tools",
  "repository": "https://github.com/company/enterprise-plugin",
  "license": "MIT",
  "keywords": ["enterprise", "workflow", "automation"],
  "commands": [
    "./commands/core/",
    "./commands/enterprise/"
  ],
  "agents": ["./agents/security-reviewer.md"],
  "skills": "./skills/",
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/scripts/validate.sh"
          }
        ]
      }
    ]
  },
  "mcpServers": {
    "enterprise-db": {
      "command": "${CLAUDE_PLUGIN_ROOT}/servers/db-server",
      "args": ["--config", "${CLAUDE_PLUGIN_ROOT}/config.json"]
    }
  }
}
```

### Directory Structure

```
enterprise-plugin/
├── .claude-plugin/
│   └── plugin.json           # Required manifest
├── commands/                 # Slash commands (*.md)
│   ├── deploy.md
│   └── status.md
├── agents/                   # Subagents (*.md)
│   └── security-reviewer.md
├── skills/                   # Agent Skills
│   └── code-reviewer/
│       ├── SKILL.md
│       └── scripts/
├── hooks/
│   └── hooks.json
├── .mcp.json                 # MCP server config
├── .lsp.json                 # LSP server config
├── scripts/                  # Utility scripts
├── LICENSE
└── CHANGELOG.md
```

---

## 7. Enterprise Distribution

### Team Auto-Installation

Add to `.claude/settings.json` in your repository:
```json
{
  "extraKnownMarketplaces": {
    "company-tools": {
      "source": {
        "source": "github",
        "repo": "your-org/claude-plugins"
      }
    }
  },
  "enabledPlugins": {
    "code-formatter@company-tools": true,
    "deployment-tools@company-tools": true
  }
}
```

Team members are automatically prompted to install when they trust the project folder.

### Administrative Controls

Restrict allowed marketplaces via managed settings:

**Disable all marketplace additions**:
```json
{
  "strictKnownMarketplaces": []
}
```

**Allowlist specific marketplaces**:
```json
{
  "strictKnownMarketplaces": [
    {
      "source": "github",
      "repo": "acme-corp/approved-plugins"
    },
    {
      "source": "url",
      "url": "https://plugins.internal.company.com/marketplace.json"
    }
  ]
}
```

---

## Sources

### Official Documentation
- [Claude Code Plugins Reference](https://code.claude.com/docs/en/plugins-reference)
- [Create and Distribute Plugin Marketplaces](https://code.claude.com/docs/en/plugin-marketplaces)
- [Discover and Install Plugins](https://code.claude.com/docs/en/discover-plugins)
- [Anthropic Official Blog: Claude Code Plugins](https://www.anthropic.com/news/claude-code-plugins)

### Official Repositories
- [claude-plugins-official (Anthropic)](https://github.com/anthropics/claude-plugins-official)
- [claude-code (Anthropic)](https://github.com/anthropics/claude-code)
- [@anthropic-ai/claude-code (npm)](https://www.npmjs.com/package/@anthropic-ai/claude-code)

### Community Resources
- [superpowers-marketplace](https://github.com/obra/superpowers-marketplace)
- [superpowers core](https://github.com/obra/superpowers)
- [claude-plugins.dev](https://claude-plugins.dev/)

---

## Summary

Claude Code uses a **Git-based marketplace system** for plugin distribution, not npm or a custom registry. The official Anthropic marketplace (`claude-plugins-official`) provides curated plugins, while community marketplaces like `superpowers-marketplace` offer additional workflow tools.

**Key Takeaways**:
1. Plugins are distributed via Git repositories, not npm packages
2. The only required field in `plugin.json` is `name`
3. Marketplaces are JSON catalogs pointing to plugin sources
4. Enterprise teams can restrict and pre-configure marketplaces
5. Auto-updates are available but disabled by default for third-party marketplaces
6. Community registries like claude-plugins.dev index public plugins automatically
