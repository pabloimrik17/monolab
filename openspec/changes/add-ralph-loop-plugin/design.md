## Context

The Ralph Wiggum technique went viral in late 2025 as a way to run autonomous AI coding loops. Users want to leverage this pattern but writing the scripts manually is error-prone and platform-dependent.

This plugin generates scripts following proven community patterns.

## Goals / Non-Goals

**Goals:**
- Generate platform-appropriate loop scripts (bash, PowerShell)
- Include safety limits by default
- Provide PROMPT.md templates for declarative specifications
- Educate users on the technique via help command

**Non-Goals:**
- Running loops directly (script handles execution)
- Managing API costs (user responsibility)
- Supporting every shell variant (focus on bash + PowerShell)

## Decisions

### Decision: Generate scripts, don't execute them

The plugin generates scripts the user runs manually. This:
- Keeps the plugin simple (no process management)
- Gives users control over execution
- Avoids permission/security concerns
- Matches how the community uses Ralph

### Decision: PROMPT.md as declarative specification

Following Huntley's pattern, the prompt is a separate file with declarative specs, not imperative instructions. This:
- Separates task definition from loop mechanics
- Makes prompts reusable and versionable
- Aligns with the "what, not how" principle

### Decision: Default safety limits

Scripts include `--max-iterations 20` by default. Users can increase but must do so explicitly. This prevents runaway costs.

## Skill Content Draft

### skills/generate.md

```markdown
---
name: generate
description: Use when user wants to create a Ralph loop script for autonomous AI coding tasks
---

# Generate Ralph Loop Script

## Overview

Generate a platform-specific script that runs Claude Code in an autonomous loop until completion criteria are met.

**Core principle:** Progress lives in files and git, not in context. Each iteration starts fresh.

## When to Use

**Good fit:**
- Large refactors (framework migrations, dependency upgrades)
- Batch operations (documentation generation, test coverage)
- Greenfield builds with clear specs
- Tasks with measurable "done" criteria

**Poor fit:**
- Exploratory work (unclear requirements)
- Tasks requiring human judgment mid-process
- Security-sensitive operations
- First-time unfamiliar codebases

## The Process

1. **Gather requirements** from user:
   - Task description
   - Completion criteria (how to know it's done)
   - Max iterations (default: 20)
   - Platform preference (auto-detect or override)

2. **Generate files:**
   - Loop script (bash or PowerShell)
   - PROMPT.md template

3. **Output with instructions**

## Platform Detection

```javascript
// Pseudo-code for platform detection
const platform = process.platform; // darwin, linux, win32
const shell = platform === 'win32' ? 'powershell' : 'bash';
```

## Bash Script Template

```bash
#!/bin/bash
set -e

# Ralph Loop - Autonomous AI Coding
# Task: {{TASK_DESCRIPTION}}
# Generated: {{DATE}}

MAX_ITERATIONS={{MAX_ITERATIONS:-20}}
ITERATION=0
PROMPT_FILE="PROMPT.md"

echo "Starting Ralph loop (max $MAX_ITERATIONS iterations)"
echo "Task: {{TASK_DESCRIPTION}}"
echo ""

while [ $ITERATION -lt $MAX_ITERATIONS ]; do
    ITERATION=$((ITERATION + 1))
    echo "=== Iteration $ITERATION of $MAX_ITERATIONS ==="

    # Run Claude Code with the prompt
    if cat "$PROMPT_FILE" | claude --print; then
        echo "Claude indicated completion"
        break
    fi

    # Optional: commit progress after each iteration
    # git add -A && git commit -m "Ralph iteration $ITERATION" || true

    echo "Iteration $ITERATION complete, continuing..."
    sleep 2
done

if [ $ITERATION -ge $MAX_ITERATIONS ]; then
    echo "Reached max iterations ($MAX_ITERATIONS)"
    echo "Review progress and adjust PROMPT.md if needed"
fi
```

## PowerShell Script Template

```powershell
# Ralph Loop - Autonomous AI Coding
# Task: {{TASK_DESCRIPTION}}
# Generated: {{DATE}}

$MaxIterations = {{MAX_ITERATIONS}}
$Iteration = 0
$PromptFile = "PROMPT.md"

Write-Host "Starting Ralph loop (max $MaxIterations iterations)"
Write-Host "Task: {{TASK_DESCRIPTION}}"
Write-Host ""

while ($Iteration -lt $MaxIterations) {
    $Iteration++
    Write-Host "=== Iteration $Iteration of $MaxIterations ==="

    # Run Claude Code with the prompt
    $result = Get-Content $PromptFile | claude --print
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Claude indicated completion"
        break
    }

    Write-Host "Iteration $Iteration complete, continuing..."
    Start-Sleep -Seconds 2
}

if ($Iteration -ge $MaxIterations) {
    Write-Host "Reached max iterations ($MaxIterations)"
    Write-Host "Review progress and adjust PROMPT.md if needed"
}
```

## PROMPT.md Template

```markdown
# Task: {{TASK_DESCRIPTION}}

## Objective

{{USER_OBJECTIVE}}

## Completion Criteria

The task is COMPLETE when:
- [ ] {{CRITERION_1}}
- [ ] {{CRITERION_2}}
- [ ] {{CRITERION_3}}

When all criteria are met, exit with success.

## Constraints

DO NOT:
- {{CONSTRAINT_1}}
- {{CONSTRAINT_2}}

## Context

Relevant files:
- {{FILE_1}}
- {{FILE_2}}

Patterns to follow:
- {{PATTERN_1}}
```

## Safety Warnings

Always include in output:

> **Cost Warning:** Each iteration consumes API tokens. A 50-iteration loop on a large codebase can cost $50-100+. Start with 10-20 iterations.
>
> **Progress Check:** Monitor with `git log` and file changes. If stuck, reduce scope in PROMPT.md.
>
> **Stop Anytime:** Ctrl+C to interrupt the loop.

## Example Interaction

**User:** Generate a ralph loop to migrate all tests from Jest to Vitest

**Assistant:**
1. Detects platform (macOS → bash)
2. Asks for max iterations (user: 30)
3. Generates `ralph-jest-vitest.sh` and `PROMPT.md`
4. Outputs files with usage instructions

## Output Format

```
Generated files:
  - ralph-{{TASK_SLUG}}.sh (or .ps1)
  - PROMPT.md

To run:
  chmod +x ralph-{{TASK_SLUG}}.sh
  ./ralph-{{TASK_SLUG}}.sh

Monitor progress:
  git log --oneline -10

Stop anytime: Ctrl+C
```
```

### commands/help.md

```markdown
---
description: Learn about the Ralph Wiggum technique for autonomous AI coding loops
---

# Ralph Loop Help

## What is Ralph?

The **Ralph Wiggum technique** is an iterative AI development pattern created by Geoff Huntley in 2025. Named after The Simpsons character, it embodies persistent iteration despite setbacks.

**The core idea:** A while loop repeatedly feeds an AI agent a prompt until completion criteria are met.

```bash
while :; do cat PROMPT.md | claude; done
```

Progress doesn't persist in the LLM's context—it lives in your files and git history. Each iteration gets fresh context, picking up where the last one left off.

## When to Use

**Good fit:**
- Large refactors (Jest → Vitest, React class → hooks)
- Framework migrations
- Batch documentation generation
- Test coverage expansion
- Greenfield builds with clear specs

**Poor fit:**
- Exploratory work without clear goals
- Tasks requiring human judgment
- Unfamiliar codebases (explore first)
- Security-critical changes

## Best Practices

1. **Clear completion criteria** - "All tests pass" not "improve tests"
2. **Small, manageable changes** - Run nightly with small merges
3. **Set iteration limits** - Start with 10-20, increase if needed
4. **Monitor progress** - `git log`, file diffs
5. **Declarative prompts** - Describe WHAT, not HOW

## Cost Awareness

Each iteration consumes tokens. A 50-iteration loop can cost $50-100+.

- Start conservative (10-20 iterations)
- Monitor progress early
- Refine PROMPT.md if stuck

## References

- [Brief History of Ralph](https://www.humanlayer.dev/blog/brief-history-of-ralph)
- [Getting Started with Ralph](https://www.aihero.dev/getting-started-with-ralph)
- [Matt Pocock on Ralph](https://x.com/mattpocockuk/status/2007924876548637089)

## Generate a Script

Use `/ralph-loop:generate` to create a loop script for your platform.
```

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Users run expensive loops | Default max-iterations=20, prominent cost warnings |
| Generated scripts have bugs | Test on macOS/Linux/Windows before release |
| Technique misunderstood | Help command with clear guidance |

## Open Questions

1. Should we support `--auto-commit` flag in generated scripts?
2. Should we detect if `claude` CLI is installed before generating?
3. Support for fish/zsh-specific scripts or just bash?
