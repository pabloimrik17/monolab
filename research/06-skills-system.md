# Claude Code Skills System Architecture

## Overview

Skills are a sophisticated prompt-based meta-tool architecture that extends Claude Code's capabilities through specialized instruction injection. Unlike traditional function calling or code execution, skills operate through **prompt expansion and context modification** to modify how Claude processes subsequent requests without writing executable code.

Skills were launched on **October 16, 2025** as part of Claude Code's extensibility model.

---

## 1. What are Skills?

### Definition and Purpose

Skills are **markdown files that teach Claude how to do something specific**. They are "executable knowledge packages" that Claude loads only when needed, extending capabilities while keeping the main prompt lean.

Key characteristics:
- **Model-invoked**: Claude automatically applies relevant skills when your request matches their description
- **Progressive disclosure**: Information is loaded in stages as needed, rather than consuming context upfront
- **Context modifiers**: Skills inject instruction prompts into the conversation context

### Difference from MCP Servers

| Feature | Skills | MCP Servers |
|---------|--------|-------------|
| **Purpose** | Add knowledge/workflows | Provide tools |
| **Trigger** | Claude auto-chooses based on description | Claude calls as needed |
| **Content** | Markdown instructions | Executable tool definitions |
| **Use Case** | Teach Claude patterns, standards, workflows | Connect Claude to external data/services |

> "Skills tell Claude how to use tools; MCP provides the tools. For example, an MCP server connects Claude to your database, while a Skill teaches Claude your data model and query patterns."

### Difference from Slash Commands

| Feature | Skills | Slash Commands |
|---------|--------|----------------|
| **Trigger** | Claude auto-chooses | User types `/command` |
| **Discovery** | Semantic matching with descriptions | Manual invocation |
| **Use Case** | Specialized knowledge, standards | Explicit reusable prompts |

Both can coexist and serve different purposes. Use slash commands for explicit, repeatable terminal entry points. Use skills when you want Claude to auto-apply richer workflows.

### How Skills Extend Claude Code

Skills extend Claude Code through:
1. **Prompt expansion**: Injecting specialized instructions into context
2. **Tool permission modification**: Restricting or enabling specific tools
3. **Model selection**: Optionally specifying a different Claude model
4. **Progressive resource loading**: Bundling scripts and reference docs that load on-demand

---

## 2. Skill Structure

### File Format (SKILL.md)

Every skill must include a `SKILL.md` file with YAML frontmatter and Markdown instructions:

```markdown
---
name: your-skill-name
description: Brief description of what this Skill does and when to use it
---

# Your Skill Name

## Instructions
Provide clear, step-by-step guidance for Claude.

## Examples
Show concrete examples of using this Skill.
```

### Required Metadata

| Field | Required | Description | Max Length |
|-------|----------|-------------|------------|
| `name` | Yes | Lowercase letters, numbers, hyphens only | 64 chars |
| `description` | Yes | When to use this skill (Claude uses for matching) | 1024 chars |

### Optional Metadata

| Field | Description |
|-------|-------------|
| `allowed-tools` | Tools Claude can use without asking permission |
| `model` | Specific Claude model for this skill |
| `disable-model-invocation` | Prevents automatic invocation (requires manual `/skill-name`) |
| `version` | Metadata for tracking skill versions |
| `mode` | Boolean for "mode commands" that modify Claude's behavior |

### Multi-File Skill Structure

For complex skills, use **progressive disclosure**:

```
my-skill/
├── SKILL.md              # Required - overview and navigation
├── reference.md          # Detailed docs - loaded when needed
├── examples.md           # Usage examples - loaded when needed
└── scripts/
    ├── helper.py         # Utility scripts - executed, not loaded
    └── validate.py
```

Best practices:
- Keep `SKILL.md` under 500 lines (ideally under 5,000 words)
- Link supporting files one level deep from `SKILL.md`
- Bundle utility scripts for zero-context execution
- Claude only loads files when the task requires them

---

## 3. Skill Types

### User-Invocable Skills (Slash Commands)

When skills have `disable-model-invocation: true`, they become exclusively user-invocable via `/skill-name`:

```yaml
---
name: dangerous-operation
description: Performs a destructive database operation
disable-model-invocation: true
---
```

This is ideal for:
- Dangerous operations
- Configuration commands
- Interactive workflows requiring explicit user control

### Auto-Triggered Skills

By default, skills are **auto-triggered** based on semantic matching:

1. Claude scans skill descriptions at startup
2. When a user request matches a skill's description, Claude asks to use it
3. After confirmation, the full skill instructions are loaded

Example of a well-crafted auto-trigger description:

```yaml
description: Extract text and tables from PDF files, fill forms, merge documents.
Use when working with PDF files or when the user mentions PDFs, forms, or document extraction.
```

### Proactive Skills

Some skills are designed to be proactive, activating before the user explicitly requests them. The superpowers plugin demonstrates this pattern:

```yaml
---
name: brainstorming
description: You MUST use this before any creative work - creating features,
building components, adding functionality, or modifying behavior.
---
```

These skills include trigger conditions in their descriptions that make them activate for broad categories of work.

---

## 4. Skill Discovery

### How Claude Code Finds Skills

Claude Code scans multiple locations and builds an `<available_skills>` list:

| Location | Path | Applies To | Priority |
|----------|------|-----------|----------|
| **Enterprise** | Managed settings | All organization users | Highest |
| **Personal** | `~/.claude/skills/` | You, across all projects | High |
| **Project** | `.claude/skills/` | Team members in this repo | Medium |
| **Plugin** | `skills/` in plugin directory | Plugin users | Lowest |

Higher priority skills override lower priority ones with the same name.

### Plugin-Provided Skills

Plugins can bundle skills in their `skills/` directory:

```
plugin-name/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   └── my-skill/
│       └── SKILL.md
└── ...
```

Install via marketplace:
```bash
/plugin marketplace add obra/superpowers-marketplace
/plugin install superpowers@superpowers-marketplace
```

### Local Skills

Create project-local skills in `.claude/skills/`:

```
.claude/skills/
├── pdf/
│   ├── SKILL.md
│   └── extract_text.py
└── csv/
    ├── SKILL.md
    └── analyze.py
```

---

## 5. Creating Skills

### Writing Effective Skills

**Description is critical** - Claude uses it to determine when to invoke:

Bad:
```yaml
description: Helps with documents
```

Good:
```yaml
description: Extract text and tables from PDF files, fill forms, merge documents.
Use when working with PDF files or when the user mentions PDFs, forms, or document extraction.
```

A good description answers:
1. **What does this Skill do?** List specific capabilities
2. **When should Claude use it?** Include trigger terms users would mention

### Best Practices

**Do:**
- Write descriptions with specific keywords and trigger terms
- Keep `SKILL.md` focused and under 500 lines
- Use progressive disclosure for detailed content
- Include concrete examples with inputs and outputs
- Test incrementally after each significant change

**Don't:**
- Use deeply nested file references (A -> B -> C)
- Create vague descriptions
- Put all content in `SKILL.md`
- Assume external packages are installed
- Use backslashes in file paths

### Example: Simple Skill (Single File)

```markdown
---
name: generating-commit-messages
description: Generates clear commit messages from git diffs. Use when writing commit messages.
---

# Generating Commit Messages

## Instructions

1. Run `git diff --staged` to see changes
2. Suggest a commit message with:
   - Summary under 50 characters
   - Detailed description
   - Affected components

## Best practices

- Use present tense
- Explain what and why, not how
```

### Examples from superpowers-marketplace

The [superpowers](https://github.com/obra/superpowers) plugin provides battle-tested skills:

**test-driven-development** - Enforces RED-GREEN-REFACTOR cycles:
```yaml
---
name: test-driven-development
description: Use when implementing any feature or bugfix, before writing implementation code
---
```

**systematic-debugging** - Root cause analysis:
```yaml
---
name: systematic-debugging
description: Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes
---
```

**brainstorming** - Socratic design refinement:
```yaml
---
name: brainstorming
description: You MUST use this before any creative work - creating features,
building components, adding functionality, or modifying behavior.
---
```

---

## 6. Skill Invocation

### How Skills Are Triggered

Skills follow a **three-step process**:

1. **Discovery (Startup)**
   - Claude loads only name and description of each skill (~30-50 tokens each)
   - Keeps startup fast

2. **Activation (Request Matching)**
   - Claude performs semantic similarity matching
   - Matches request against skill descriptions
   - Asks user for confirmation before loading full `SKILL.md`

3. **Execution**
   - Full skill instructions are loaded
   - Claude follows skill guidance
   - Referenced files are loaded as needed

### The Skill Tool

Claude Code provides a **Skill tool** to Claude - a meta-tool for invoking skills:

```typescript
// Tool Definition (simplified)
{
  name: "Skill",
  input_schema: {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "The skill name. E.g., 'pdf' or 'xlsx'"
      }
    },
    required: ["command"]
  }
}
```

The tool description includes an `<available_skills>` section built from frontmatter:

```xml
<available_skills>
  <skill>
    <name>pdf</name>
    <description>Extract and analyze text from PDF documents...</description>
    <location>user</location>
  </skill>
</available_skills>
```

### Context Passing

When invoked, the Skill tool response includes:
- The skill's base path
- Full `SKILL.md` body content
- Context is expanded with skill instructions

Skills modify context through:
- **Instruction prompts** (via `isMeta: true` messages)
- **Tool permissions** (via `allowed-tools`)
- **Model selection** (via `model` field)

### Tool Permission Restrictions

Use `allowed-tools` to limit Claude's capabilities during skill execution:

```yaml
---
name: reading-files-safely
description: Read files without making changes.
allowed-tools: Read, Grep, Glob
---

# Safe File Reader

This Skill provides read-only file access.
```

Pattern examples:
- `allowed-tools: Read, Grep, Glob` - Multiple read-only tools
- `allowed-tools: Bash(git status:*), Bash(git diff:*)` - Specific command patterns

---

## 7. Troubleshooting

### Skill Not Triggering

**Cause:** Vague description doesn't match requests

**Fix:** Include specific capabilities and trigger keywords:
```yaml
# Instead of:
description: Helps with documents

# Use:
description: Extract text and tables from PDF files, fill forms.
Use when working with PDFs or document extraction.
```

### Skill Doesn't Load

- Check file path and `SKILL.md` filename (case-sensitive)
- Validate YAML syntax (spaces, not tabs)
- Ensure frontmatter starts on line 1 (no blank lines before `---`)
- Run `claude --debug` for error messages

### Skill Has Errors

- Verify external packages are installed
- Ensure script permissions: `chmod +x scripts/*.py`
- Use forward slashes in paths: `scripts/helper.py`

### Plugin Skills Not Appearing

```bash
rm -rf ~/.claude/plugins/cache
# Restart Claude Code and reinstall plugin
```

---

## 8. Architecture Deep Dive

### Progressive Disclosure System

Skills implement a token-efficient architecture:

1. **Metadata scanning**: ~100 tokens per skill during discovery
2. **Activation**: Full skill content loads at <5k tokens
3. **Resource loading**: Bundled files load only as needed

### Selection Mechanism

Skills are selected via **LLM reasoning, not algorithmic matching**:
- Claude reads all skill descriptions
- Semantic understanding determines relevance
- No keyword matching or rules engine

### Context Window Changes

When a skill is triggered:
1. Skill instructions are injected into conversation context
2. Tool permissions may be modified
3. Model may be switched if specified
4. Referenced files are loaded progressively

---

## Sources

- [Agent Skills - Claude Code Docs](https://code.claude.com/docs/en/skills)
- [Claude Agent Skills: A First Principles Deep Dive](https://leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive/)
- [Inside Claude Code Skills: Structure, prompts, invocation](https://mikhail.io/2025/10/claude-code-skills/)
- [GitHub - anthropics/skills](https://github.com/anthropics/skills)
- [GitHub - obra/superpowers](https://github.com/obra/superpowers)
- [GitHub - obra/superpowers-marketplace](https://github.com/obra/superpowers-marketplace)
- [Introducing Agent Skills | Anthropic](https://www.anthropic.com/news/skills)
- [How to create custom Skills | Claude Help Center](https://support.claude.com/en/articles/12512198-how-to-create-custom-skills)
- [What are Skills? | Claude Help Center](https://support.claude.com/en/articles/12512176-what-are-skills)
- [Slash commands - Claude Code Docs](https://code.claude.com/docs/en/slash-commands)
