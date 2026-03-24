---
name: hookify
description: Analyze CLAUDE.md and AGENTS.md for deterministic instructions that can be converted to Claude Code hooks. Proposes one highest-impact hookifiable instruction per invocation and, on confirmation, generates the bash hook script, updates settings.json, and removes the instruction from the source file. Use when starting a session, reviewing project instructions, or when asked to optimize CLAUDE.md.
---

# Hookify

Convert deterministic CLAUDE.md/AGENTS.md instructions into enforced Claude Code hooks.

## Overview

CLAUDE.md instructions are soft rules — Claude tries to follow them but can forget or skip them. Deterministic instructions (always/never + concrete CLI action) are more reliable as hooks: zero exceptions, zero latency, zero token cost.

This skill reads project instruction files, identifies the single highest-impact hookifiable instruction, proposes it, and on user confirmation implements the hook end-to-end.

## Step 1: Check jq availability

Before anything else, run:

```bash
which jq
```

If `jq` is not found, warn the user:

> jq is required for hook scripts. Install it before proceeding:
>
> - macOS: `brew install jq`
> - Ubuntu/Debian: `sudo apt-get install jq`
> - Other: <https://jqlang.github.io/jq/download/>

Stop here if jq is missing.

## Step 2: Read instruction files

Read **CLAUDE.md** and **AGENTS.md** from the project root (the working directory).

- If both exist, read both
- If only one exists, read that one
- If neither exists, report: "No CLAUDE.md or AGENTS.md found — nothing to hookify." and stop

## Step 3: Filter out managed sections

Before analyzing, remove all content between HTML comment delimiters:

```text
<!-- X start -->
...content to skip...
<!-- X end -->
```

Matching rules:

- Case-insensitive (`<!-- NX Configuration Start -->` matches)
- Flexible whitespace around the tag name and start/end keywords
- The `X` can be any identifier (e.g., `nx configuration`, `auto-generated`, `plugin managed`)
- Same-label pairing: `<!-- X start -->` pairs with the nearest subsequent `<!-- X end -->` where `X` is identical (case-insensitive)
- Non-greedy: stop at the first matching end delimiter — don't span across multiple blocks
- Remove the delimiters AND everything between them from analysis

Only analyze content **outside** these managed sections.

## Step 4: Classify instructions

For each instruction/rule/directive found in the unmanaged content, classify it as **hookifiable** or **not hookifiable**.

**Hookifiable** — an instruction is hookifiable when ALL of these are true:

1. It contains a deterministic directive: always/never/must/don't + a concrete CLI action
2. It can be enforced via pattern matching on `Bash` tool input (the command string)
3. It does NOT require understanding intent, context, or code semantics

Examples of hookifiable instructions:

- "Always use bun instead of npm/yarn/pnpm" — can match `npm`, `yarn`, `pnpm` in command strings
- "Never use `rm -rf /`" — can match the exact pattern
- "Always run `nx` commands with the workspace package manager prefix" — can match bare `nx` without prefix

Examples of NOT hookifiable:

- "Prefer composition over inheritance" — requires code understanding
- "Keep functions small" — subjective, no CLI pattern
- "Be concise in commit messages" — requires judging content quality
- "Use TypeScript strict mode" — config-level, not per-command

## Step 5: Prioritize by gain

If multiple instructions are hookifiable, select the ONE with highest gain. Evaluate these factors (descending priority):

1. **Violation frequency** — instructions about common actions (package manager, git, build commands) rank higher
2. **Determinism** — exact command pattern match ranks higher than fuzzy match
3. **Token savings** — instructions with large supporting content (tables, examples, multi-line explanations) save more tokens when removed
4. **Failure impact** — preventing destructive or hard-to-reverse actions ranks higher

Use your judgment to weigh these factors. No scoring formula — pick the clear winner.

## Step 6: Present proposal (or report nothing to hookify)

### If nothing is hookifiable

Report:

> **All good!** No hookifiable instructions found in your project files. All instructions are either managed sections (auto-generated) or conceptual guidance that requires human judgment.

Stop here.

### If a hookifiable instruction is found

Present it using this format:

---

### Hookify proposal

**Source:** `CLAUDE.md` or `AGENTS.md`, line(s) `N-M`

**Original instruction:**
Quote the instruction text here.

**Proposed hook:** `PreToolUse` on `Bash` tool

**What the hook does:**
Describe what the bash script will match and block (1-2 sentences).

**Why this is better as a hook:**
Describe deterministic enforcement, token savings, etc. (1-2 sentences).

---

## Step 7: Ask for confirmation

Use the **AskUserQuestion** tool to ask:

> Convert this instruction to a hook? (yes/no)

- If **yes** (or affirmative): proceed to Step 8
- If **no** (or negative): respond "OK, keeping the instruction as-is." and stop

## Step 8: Generate the hook

On confirmation, do all three of these:

### 8a. Create the bash hook script

Write to `.claude/hooks/hookify-<slug>.sh` where `<slug>` is a kebab-case descriptor (e.g., `enforce-bun`, `block-force-push`).

Template:

```bash
#!/usr/bin/env bash
# Generated by hookify — <short description>
# Source: <file>:<line range>

set -euo pipefail

# Read tool input from stdin
INPUT=$(cat)

# Extract the command being run
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if [ -z "$COMMAND" ]; then
  exit 0
fi

# <PATTERN MATCHING LOGIC>
# Match against the rule and exit 2 with descriptive message on violation
# Exit 0 if the command is allowed

<custom matching logic here>
```

Key rules for the script:

- Read JSON from stdin, extract `.tool_input.command` via jq
- Exit 2 with descriptive stderr message on violation (Claude sees this)
- Exit 0 on pass
- Include a helpful suggestion in the error message (e.g., "Use `bun add` instead of `npm install`")
- Make the script executable (`chmod +x`)

### 8b. Update settings.json

Read `.claude/settings.json` (or create if missing). Add the hook entry under `hooks.PreToolUse`:

```json
{
    "hooks": {
        "PreToolUse": [
            {
                "matcher": "Bash",
                "hooks": [
                    {
                        "type": "command",
                        "command": ".claude/hooks/hookify-<slug>.sh"
                    }
                ]
            }
        ]
    }
}
```

If `hooks.PreToolUse` already has entries, append the new matcher. If an existing entry already matches `Bash`, append to its `hooks` array. Preserve all existing settings.

### 8c. Remove the hookified instruction from source

Remove the instruction (and any supporting content like tables or examples that are now redundant — the hook's stderr message replaces them) from the source file.

After removal:

- No orphaned empty headers should remain
- No excess blank lines (max 2 consecutive)
- File should still be valid markdown

## Session behavior

- **Autonomous trigger** (via description match): runs at most once per session. If the skill auto-triggers and finds nothing hookifiable, it stays silent and does not interrupt.
- **Explicit invocation** (`/experiments:hookify`): always runs full analysis regardless of prior runs in the session.
