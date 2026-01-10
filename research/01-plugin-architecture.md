# Claude Code Plugin Architecture

> Research completed: January 6, 2026

This document provides a comprehensive overview of Claude Code's plugin architecture, covering plugin structure, types, configuration, lifecycle, and available APIs.

## Table of Contents

1. [Plugin Structure](#1-plugin-structure)
2. [Plugin Types](#2-plugin-types)
3. [Configuration](#3-configuration)
4. [Lifecycle](#4-lifecycle)
5. [APIs Available to Plugins](#5-apis-available-to-plugins)
6. [Sources](#sources)

---

## 1. Plugin Structure

### 1.1 Directory Layout

Claude Code plugins follow a standardized directory structure:

```
my-plugin/
├── .claude-plugin/
│   └── plugin.json          # Required: Plugin manifest (ONLY file in this folder)
├── commands/                # Optional: Slash commands
│   └── hello.md
├── agents/                  # Optional: Custom subagents
│   └── reviewer/
│       └── AGENT.md
├── skills/                  # Optional: Agent skills
│   └── code-review/
│       └── SKILL.md
├── hooks/                   # Optional: Event handlers
│   └── hooks.json
├── .mcp.json               # Optional: MCP server configuration
├── .lsp.json               # Optional: LSP server configuration
└── README.md
```

**Critical Rule**: Only `plugin.json` goes inside `.claude-plugin/`. All other directories (commands/, agents/, skills/, hooks/) must be at the plugin root level.

### 1.2 Plugin Manifest (plugin.json)

The `.claude-plugin/plugin.json` file is the only required file. It defines plugin metadata:

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "Brief plugin description",
  "author": {
    "name": "Author Name",
    "email": "author@example.com",
    "url": "https://github.com/author"
  },
  "homepage": "https://docs.example.com/plugin",
  "repository": "https://github.com/author/plugin",
  "license": "MIT",
  "keywords": ["keyword1", "keyword2"],
  "commands": ["./custom/commands/special.md"],
  "agents": "./custom/agents/",
  "hooks": "./config/hooks.json",
  "mcpServers": "./mcp-config.json"
}
```

#### Field Reference

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `name` | Yes | string | Unique identifier; becomes slash command namespace (`/plugin-name:command`) |
| `version` | Yes | string | Semantic versioning (e.g., "1.0.0") - must be string, not number |
| `description` | Yes | string | Shown in plugin manager when browsing/installing |
| `author` | No | object | Must be object with `name`, `email` (optional), `url` (optional) |
| `homepage` | No | string | Documentation URL |
| `repository` | No | string | Source repository URL |
| `license` | No | string | License identifier (e.g., "MIT", "Apache-2.0") |
| `keywords` | No | array | Search keywords - must be array, not comma-separated string |
| `commands` | No | array/string | Custom command paths |
| `agents` | No | string | Custom agents directory path |
| `hooks` | No | string | Hooks configuration path |
| `mcpServers` | No | string/object | MCP server configuration |

### 1.3 Entry Points

Plugins can provide multiple entry points:

- **Commands**: Markdown files in `commands/` become namespaced slash commands
- **Skills**: `SKILL.md` files in `skills/*/` are auto-invoked by Claude
- **Agents**: `AGENT.md` files in `agents/*/` become delegable subagents
- **Hooks**: `hooks/hooks.json` defines event-triggered scripts
- **MCP Servers**: `.mcp.json` configures external tool integrations
- **LSP Servers**: `.lsp.json` configures language intelligence

---

## 2. Plugin Types

Claude Code supports several types of plugin components, each serving different purposes.

### 2.1 Slash Commands

Commands are Markdown files that users invoke explicitly with `/plugin-name:command-name`.

**Location**: `commands/` directory
**Naming**: Filename becomes command name (e.g., `greet.md` -> `/my-plugin:greet`)

```markdown
---
description: Greet the user with a personalized message
---

# Hello Command

Greet the user named "$ARGUMENTS" warmly and ask how you can help them today.
Make the greeting personal and encouraging.
```

**Argument Placeholders**:
- `$ARGUMENTS` - All text after the command
- `$1`, `$2`, etc. - Individual positional parameters

### 2.2 Agent Skills

Skills are model-invoked capabilities that Claude automatically triggers based on task context.

**Location**: `skills/skill-name/SKILL.md`
**Trigger**: Automatic, based on semantic matching with request

```markdown
---
name: code-review
description: Reviews code for best practices and potential issues.
  Use when reviewing code, checking PRs, or analyzing code quality.
allowed-tools: Read, Grep, Glob
model: sonnet
---

# Code Review Skill

When reviewing code, check for:
1. Code organization and structure
2. Error handling
3. Security concerns
4. Test coverage

## Additional Resources
- For detailed guidelines, see [guidelines.md](guidelines.md)
- For examples, see [examples.md](examples.md)
```

#### SKILL.md Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Lowercase letters, numbers, hyphens (max 64 chars) |
| `description` | Yes | What skill does and when to use (max 1024 chars) |
| `allowed-tools` | No | Restrict tools when skill is active (e.g., `Read, Grep, Glob`) |
| `model` | No | Specific model (e.g., `claude-sonnet-4-20250514`) |
| `disable-model-invocation` | No | Boolean - prevents auto-invocation if true |

### 2.3 Subagents

Subagents are specialized AI assistants with dedicated context windows and custom configurations.

**Location**: `agents/agent-name/AGENT.md` or `agents/agent-name.md`
**Trigger**: Manual invocation or Claude delegation

```markdown
---
name: code-reviewer
description: Expert code review specialist. Use proactively after code changes.
tools: Read, Grep, Glob, Bash
model: sonnet
permissionMode: default
skills: security-check, style-guide
---

You are a senior code reviewer ensuring high standards of code quality.

When invoked:
1. Run git diff to see recent changes
2. Focus on modified files
3. Begin review immediately

Review checklist:
- Code is clear and readable
- Functions well-named
- No duplicated code
- Proper error handling
```

#### AGENT.md Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Unique identifier (lowercase, hyphens) |
| `description` | Yes | Natural language description of purpose |
| `tools` | No | Comma-separated tool list; inherits all if omitted |
| `model` | No | Model alias (`sonnet`, `opus`, `haiku`) or `inherit` |
| `permissionMode` | No | `default`, `acceptEdits`, `dontAsk`, `bypassPermissions`, `plan` |
| `skills` | No | Comma-separated skill names to auto-load |

### 2.4 Hooks

Hooks are event handlers that execute scripts at specific points during Claude Code sessions.

**Location**: `hooks/hooks.json`
**Trigger**: Automatic on matching events

```json
{
  "description": "Automatic code formatting on file changes",
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/scripts/validate.sh",
            "timeout": 30
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "npm run lint:fix $FILE"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Check if all tasks are complete before stopping.",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

#### Hook Event Types

| Event | Matcher Available | Description |
|-------|-------------------|-------------|
| `PreToolUse` | Yes | Before tool execution; can allow/deny/modify |
| `PostToolUse` | Yes | After tool completion; can provide feedback |
| `PermissionRequest` | Yes | When permission dialog shown |
| `Stop` | No | When agent finishes responding |
| `SubagentStop` | No | When subagent finishes |
| `UserPromptSubmit` | No | When user submits prompt |
| `SessionStart` | Yes* | When session starts (*matchers: startup, resume, clear, compact) |
| `SessionEnd` | No | When session ends |
| `PreCompact` | Yes* | Before compact (*matchers: manual, auto) |
| `Notification` | Yes* | On notifications (*matchers: permission_prompt, idle_prompt, etc.) |

### 2.5 MCP Servers

Model Context Protocol servers extend Claude with external tool integrations.

**Location**: `.mcp.json` at plugin root

```json
{
  "mcpServers": {
    "database-tools": {
      "command": "${CLAUDE_PLUGIN_ROOT}/servers/db-server",
      "args": ["--config", "${CLAUDE_PLUGIN_ROOT}/config.json"],
      "env": {
        "DB_URL": "${DB_URL:-localhost:5432}"
      }
    },
    "api-server": {
      "type": "http",
      "url": "https://api.example.com/mcp",
      "headers": {
        "Authorization": "Bearer ${API_KEY}"
      }
    }
  }
}
```

#### Transport Types

| Type | Description | Use Case |
|------|-------------|----------|
| `stdio` | Local process via stdin/stdout | Custom scripts, local tools |
| `http` | Remote HTTP server (recommended) | Cloud services, remote APIs |
| `sse` | Server-Sent Events (deprecated) | Legacy remote servers |

---

## 3. Configuration

### 3.1 Installation Scopes

Plugins can be installed at different scope levels:

| Scope | Location | Visibility | Use Case |
|-------|----------|------------|----------|
| **User** | `~/.claude/` | You, all projects | Personal tools |
| **Project** | `.claude/settings.json` | All collaborators | Team plugins |
| **Local** | `.claude/settings.local.json` | You, this project only | Testing |
| **Managed** | System paths | Organization | Enterprise deployment |

### 3.2 Plugin Installation

#### Via Interactive UI
```
/plugin
```
Navigate to Discover tab, select plugin, choose scope.

#### Via Command Line
```bash
# Add marketplace first
/plugin marketplace add owner/repo

# Install plugin
/plugin install plugin-name@marketplace-name

# Scope-specific installation
claude plugin install formatter@marketplace --scope project
```

#### Direct Configuration

Add to `.claude/settings.json`:
```json
{
  "extraKnownMarketplaces": ["owner/repo"],
  "enabledPlugins": ["plugin-name@marketplace-name"]
}
```

### 3.3 Environment Variable Expansion

Both `.mcp.json` and hooks support environment variable expansion:

**Syntax**:
- `${VAR}` - Expand to value
- `${VAR:-default}` - Use default if not set

**Plugin-specific variables**:
- `${CLAUDE_PLUGIN_ROOT}` - Absolute path to plugin directory
- `${CLAUDE_PROJECT_DIR}` - Project root directory

---

## 4. Lifecycle

### 4.1 Discovery

Plugins are discovered from:

1. **Official Marketplace** (`claude-plugins-official`) - Auto-available
2. **Added Marketplaces** - Via `/plugin marketplace add`
3. **Local Plugins** - Via `--plugin-dir` flag during development

### 4.2 Loading Process

```
Startup
   |
   v
Load plugin.json  -->  Validate manifest schema
   |
   v
Index Skills      -->  Load name/description only (lazy loading)
   |
   v
Register Hooks    -->  Capture hook configurations
   |
   v
Start MCP         -->  Initialize MCP server connections
   |
   v
Ready             -->  Plugin fully operational
```

### 4.3 Development Testing

```bash
# Load plugin during development (no installation required)
claude --plugin-dir ./my-plugin

# Load multiple plugins
claude --plugin-dir ./plugin-one --plugin-dir ./plugin-two

# Debug mode for troubleshooting
claude --debug
```

**Note**: Changes to plugins require Claude Code restart to take effect.

---

## 5. APIs Available to Plugins

### 5.1 Tool Access

Plugins can access Claude Code's built-in tools:

| Tool | Purpose | Use in Skills/Agents |
|------|---------|---------------------|
| `Read` | Read file contents | Analysis, review |
| `Write` | Create/overwrite files | Code generation |
| `Edit` | Modify existing files | Refactoring |
| `Bash` | Execute shell commands | Builds, tests, git |
| `Grep` | Search file contents | Code search |
| `Glob` | Match file patterns | Find files |
| `WebFetch` | Fetch URL content | Documentation |
| `WebSearch` | Search the web | Research |
| `Task` | Spawn subagent | Delegation |

Plus any MCP server tools: `mcp__<server>__<tool>`

### 5.2 Hook Input/Output API

#### Input (via stdin)

All hooks receive JSON with session context, event type, and tool information.

#### Output (via stdout)

Hooks can return JSON with:
- `continue`: Whether to proceed
- `stopReason`: Message when blocking
- `systemMessage`: Warning for user
- `hookSpecificOutput`: Event-specific controls

#### Exit Codes

| Code | Meaning | Behavior |
|------|---------|----------|
| 0 | Success | Process stdout as JSON or context |
| 2 | Blocking error | Use stderr as error message, block action |
| Other | Non-blocking error | Show stderr in verbose mode, continue |

### 5.3 Environment Variables

Available to all hooks and scripts:

| Variable | Description |
|----------|-------------|
| `CLAUDE_PROJECT_DIR` | Absolute path to project root |
| `CLAUDE_CODE_REMOTE` | `"true"` if running in web environment |
| `CLAUDE_PLUGIN_ROOT` | Absolute path to plugin directory |
| `CLAUDE_ENV_FILE` | Path for persisting env vars (SessionStart only) |

### 5.4 Security Model

#### Namespace Isolation
- All plugin commands prefixed with plugin name
- Prevents naming conflicts between plugins

#### Permission Model
- Skills can restrict available tools via `allowed-tools`
- Subagents can limit tools via `tools` field
- MCP servers require explicit user approval for project scope
- Hooks captured at startup; mid-session changes flagged

---

## Sources

### Official Documentation
- [Create plugins - Claude Code Docs](https://code.claude.com/docs/en/plugins)
- [Discover and install plugins](https://code.claude.com/docs/en/discover-plugins)
- [Hooks reference](https://code.claude.com/docs/en/hooks)
- [Agent Skills](https://code.claude.com/docs/en/skills)
- [Subagents](https://code.claude.com/docs/en/sub-agents)
- [MCP Configuration](https://code.claude.com/docs/en/mcp)

### GitHub Repositories
- [anthropics/claude-code - Official Plugin Examples](https://github.com/anthropics/claude-code/tree/main/plugins)
- [obra/superpowers - Core Skills Library](https://github.com/obra/superpowers)
- [obra/superpowers-marketplace - Plugin Marketplace](https://github.com/obra/superpowers-marketplace)
