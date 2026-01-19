# Change: Add Ralph Loop Plugin

## Why

The [Ralph Wiggum technique](https://www.humanlayer.dev/blog/brief-history-of-ralph) is a proven automation pattern for long-running AI coding tasks. Created by Geoff Huntley in 2025, it enables autonomous development loops where an AI agent iterates toward completion without human intervention.

The technique is simple but powerful: a while loop that feeds a prompt to an agent until a stop condition is met. Progress persists in files and git history, not in context—enabling fresh context each iteration.

Users currently must write these scripts manually. A plugin would:
- Generate platform-appropriate scripts (bash, PowerShell, zsh)
- Include safety limits (max iterations, cost guards)
- Provide clear completion criteria patterns
- Follow proven patterns from the community

## What Changes

- **New plugin**: `ralph-loop` in `claude-plugins/`
- **Skill**: `/ralph-loop:generate` to create loop scripts
- **Command**: `/ralph-loop:help` for technique documentation

The plugin will NOT run loops directly (that's the script's job)—it generates scripts the user executes.

## Impact

- Affected specs: `claude-code-plugins`
- Affected code: `claude-plugins/ralph-loop/`
- New files: plugin manifest, skill, command, and optional hook

## References

- [Getting Started with Ralph](https://www.aihero.dev/getting-started-with-ralph)
- [Tips for AI Coding with Ralph Wiggum](https://www.aihero.dev/tips-for-ai-coding-with-ralph-wiggum)
- [Brief History of Ralph](https://www.humanlayer.dev/blog/brief-history-of-ralph)
- [Ralph Wiggum Technique](https://awesomeclaude.ai/ralph-wiggum)
- [Matt Pocock on Ralph](https://x.com/mattpocockuk/status/2007924876548637089)
