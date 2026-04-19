# Experiments Plugin

Beta skills and commands staging area for monolab. Features here are experimental and may graduate to production plugins once stable.

## Commands

### `/experiments:commander-add`

Register the current (or specified) project in the user-scoped Commander registry at `~/.claude/commander/projects.json`. Collects `name`, `path`, `keywords`, `description`, and optional `specialRules` via **A → B → C** priority: explicit args, then a Haiku auto-detection subagent, then `AskUserQuestion` prompts. Writes are atomic.

```bash
/experiments:commander-add
/experiments:commander-add --name investlab --path /Users/me/code/investlab --keywords react,typescript --description "Portfolio tracker built with SolidStart."
```

### `/experiments:ralph`

Generate Ralph loop infrastructure from a project description for autonomous AI coding.

```bash
/experiments:ralph "Build auth system with login and logout"
```

Creates 5 files in the current directory:

- `prd.json` - PRD items extracted from description
- `progress.txt` - Iteration tracking file
- `PROMPT.md` - Prompt template with @-references
- `ralph-once.sh` - Single iteration script (HITL)
- `ralph.sh` - Autonomous loop script (AFK)

**Requirements:** Docker Desktop 4.58+ with Docker Sandbox

### `/experiments:hello-experiments`

Explains the purpose of this plugin and lists any experimental features currently available.

## Skills

### `skills-update-check`

Checks for updates to globally-installed skills.sh skills once per session. Detects the project's package runner, runs `skills check -g`, and offers to apply updates if available.

## Testing

```bash
claude --plugin-dir ./claude-plugins/experiments
```

Then use `/experiments:hello-experiments` in the Claude Code CLI.
