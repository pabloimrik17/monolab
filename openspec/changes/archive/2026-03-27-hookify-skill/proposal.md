## Why

CLAUDE.md/AGENTS.md instructions are soft rules — Claude tries to follow them but can forget or ignore. Deterministic instructions (always/never + concrete action) are more effective as hooks, which enforce with zero exceptions and free up context tokens.

## What Changes

- New skill `/experiments:hookify` in the experiments plugin
- Reads CLAUDE.md and AGENTS.md, skips `<!-- X start/end -->` sections
- Classifies instructions as hookifiable or not
- Proposes ONE highest-gain hookifiable instruction per invocation
- On user confirmation: generates bash hook script, updates `.claude/settings.json`, removes instruction from source file
- If nothing to hookify → reports "all good"

## Capabilities

### New Capabilities

- `hookify-skill`: Skill that analyzes CLAUDE.md/AGENTS.md for deterministic instructions convertible to Claude Code hooks, proposes one at a time prioritized by impact, and implements the hook on confirmation

### Modified Capabilities

- `experiments-plugin`: Adds the hookify skill to the experiments plugin's skills/ directory

## Impact

- New files: `claude-plugins/experiments/skills/hookify/SKILL.md`
- Modifies on use: `.claude/settings.json` (adds hooks), `CLAUDE.md`/`AGENTS.md` (removes hookified instruction)
- No code deps, no build changes — pure Claude Code plugin skill
