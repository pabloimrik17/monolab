## Context

The experiments plugin (`claude-plugins/experiments/`) currently has commands but no skills. CLAUDE.md/AGENTS.md files contain a mix of soft guidance and deterministic rules. Deterministic rules ("always X", "never Y") are better enforced as Claude Code hooks, which guarantee execution and reduce context token usage.

Matt Pocock's approach: a command reads CLAUDE.md, identifies deterministic instructions, generates bash hook scripts, and configures them in settings.json. We adapt this as a reusable skill.

## Goals / Non-Goals

**Goals:**
- Skill that identifies hookifiable instructions in CLAUDE.md/AGENTS.md
- Proposes ONE highest-impact instruction per invocation (not noisy)
- Generates command hooks (bash scripts) in `.claude/hooks/`
- Updates `.claude/settings.json` with hook config
- Removes hookified instruction from source file
- Skips `<!-- X start/end -->` delimited sections

**Non-Goals:**
- Prompt or agent hook types (future, not v1)
- Global `~/.claude/CLAUDE.md` analysis
- Auto-hookify without user confirmation
- Tracking which instructions were previously hookified

## Decisions

### D1: Skill (not command)

Implemented as `skills/hookify/SKILL.md`, not a command. The skill is a prompt that Claude follows — it reads files, classifies, proposes, and implements. No bash scripts or separate tooling needed for the skill itself.

**Why over command**: Skills can be invoked by name and have richer trigger descriptions. The skill content IS the prompt (like Matt's cmd.md but discoverable).

### D2: One proposal per invocation, auto-trigger once per session

Each run proposes at most one instruction to convert. The skill's autonomous trigger (description-based) fires at most once per session. Explicit user invocations (`/experiments:hookify`) are never blocked — user can run it as many times as they want.

**Why**: Auto-trigger once avoids nagging. Explicit invocations are always honored because the user asked for it.

### D3: Prioritization by gain

Priority factors (descending):
1. Violation frequency — common actions (package manager, git commands) rank higher
2. Determinism — exact pattern match > fuzzy match
3. Token savings — large instruction blocks (tables, examples) rank higher
4. Failure impact — destructive actions rank higher

Claude evaluates these heuristically per instruction. No scoring algorithm — LLM judgment is the classifier.

### D4: Command hooks only (v1)

Only bash script hooks. Maps to `PreToolUse` → `Bash` matcher (most common case for deterministic rules).

**Why over prompt/agent hooks**: Deterministic instructions map naturally to pattern matching. Zero cost, zero latency. Prompt/agent hooks are future scope.

### D5: Hook file organization

Scripts at `.claude/hooks/hookify-<slug>.sh` (e.g., `hookify-enforce-bun.sh`). Kebab-case, prefixed with `hookify-` so user knows origin.

### D6: Section filtering by HTML comments

Skip content between `<!-- X start-->` and `<!-- X end-->` (case-insensitive, flexible whitespace). These are managed sections injected by tools/plugins.

## Risks / Trade-offs

- [LLM classification may be imprecise] → Confirmation step mitigates; user always approves
- [Generated hook regex may miss edge cases] → Start with simple patterns, user can refine
- [Hook scripts need jq dependency] → Most dev machines have it; skill checks and warns if missing
- [Removing instruction from .md may break formatting] → Skill removes the specific block and ensures no orphaned headers
