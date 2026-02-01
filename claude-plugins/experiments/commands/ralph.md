---
description: Generate Ralph loop infrastructure (PRD, prompt, scripts) from a project description for autonomous AI coding
---

# Ralph Loop Scaffolding

This command generates the infrastructure for running a Ralph loop - an autonomous AI coding technique that runs Claude in a bash loop with a PRD until all tasks are complete.

## Arguments

**ARGUMENTS variable contains**: The project description provided by the user (e.g., `/experiments:ralph "Build auth system with login and logout"`)

Parse the ARGUMENTS to extract the project description. If the description is wrapped in quotes, extract the content within.

## Handle Missing Description

If ARGUMENTS is empty or not provided, use the **AskUserQuestion** tool to prompt:

> What project would you like to set up a Ralph loop for? Describe what you want to build and the key features/tasks.

Wait for the user's response before proceeding.

## Step 1: Generate PRD

Analyze the user's description and extract distinct features/tasks. For each feature:

1. Generate a **kebab-case ID** (e.g., `implement-login`, `add-password-reset`)
2. Write a clear **description** of the task
3. Generate reasonable **successCriteria** that can be verified

Create `prd.json` with this structure:

```json
{
    "name": "<project-name-from-description>",
    "items": [
        {
            "id": "<kebab-case-id>",
            "description": "<task description>",
            "successCriteria": "<how to verify completion>",
            "passes": false
        }
    ]
}
```

**Guidelines:**

-   Extract 3-10 items depending on scope
-   Each item should be independently completable
-   Success criteria should be concrete and verifiable
-   All items start with `passes: false`

## Step 2: Create Progress File

Create an empty `progress.txt` file. This file tracks work between iterations - the agent writes notes here about what was completed and what to do next.

## Step 3: Generate PROMPT.md

Create `PROMPT.md` with this template, filling in the project context:

```markdown
@prd.json @progress.txt

# <Project Name> - Ralph Loop

You are working on: <brief project context from user description>

## Instructions

1. Read the PRD items in prd.json
2. Read progress.txt for context from previous iterations
3. Pick ONE item where `passes: false`
4. Implement that item completely
5. Test your implementation
6. If the item passes, update prd.json to set `passes: true`
7. Write to progress.txt what you completed and any notes for next iteration

## Completion

When ALL items in prd.json have `passes: true`, output:

<promise>COMPLETE</promise>

Do NOT output this sigil until every item passes.

## Current Iteration

Begin by reading the files and selecting the next task to work on.
```

## Step 4: Generate Scripts

### ralph-once.sh (HITL - Human In The Loop)

Create `ralph-once.sh` for single iteration with human review:

```bash
#!/bin/bash
# Ralph Loop - Single Iteration (HITL)
# Run one iteration, review results, then run again

set -e

# Run single iteration (sandbox created/reused automatically)
docker sandbox run claude . -- -p "$(cat PROMPT.md)"

echo ""
echo "=== Iteration complete ==="
echo "Review the changes, then run ./ralph-once.sh again for next iteration"
```

### ralph.sh (AFK - Away From Keyboard)

Create `ralph.sh` for autonomous loop execution:

```bash
#!/bin/bash
# Ralph Loop - Autonomous (AFK)
# Runs until <promise>COMPLETE</promise> or max iterations

set -e

MAX_ITERATIONS=${1:-10}
ITERATION=0

echo "Starting Ralph loop (max $MAX_ITERATIONS iterations)..."

while [ $ITERATION -lt $MAX_ITERATIONS ]; do
    ITERATION=$((ITERATION + 1))
    echo ""
    echo "=== Iteration $ITERATION/$MAX_ITERATIONS ==="

    # Run iteration and capture output (sandbox created/reused automatically)
    OUTPUT=$(docker sandbox run claude . -- -p "$(cat PROMPT.md)" 2>&1) || true
    echo "$OUTPUT"

    # Check for common errors
    if echo "$OUTPUT" | grep -q "darwin/amd64"; then
        echo ""
        echo "=== ERROR: Architecture not supported ==="
        echo "Docker Sandbox requires Apple Silicon (arm64) or Linux."
        echo "Your machine is Intel (amd64)."
        exit 1
    fi

    if echo "$OUTPUT" | grep -q "docker sandbox.*not found\|command not found"; then
        echo ""
        echo "=== ERROR: Docker Sandbox not available ==="
        echo "Requires Docker Desktop 4.58+ with Sandbox feature enabled."
        exit 1
    fi

    # Check for completion sigil
    if echo "$OUTPUT" | grep -q "<promise>COMPLETE</promise>"; then
        echo ""
        echo "=== COMPLETE ==="
        echo "All PRD items passed after $ITERATION iterations"
        exit 0
    fi
done

echo ""
echo "=== MAX ITERATIONS REACHED ==="
echo "Stopped after $MAX_ITERATIONS iterations without completion"
echo "Check prd.json to see remaining items"
exit 1
```

### Make Scripts Executable

After creating both scripts, run:

```bash
chmod +x ralph-once.sh ralph.sh
```

## Output

After running this command, the current directory will contain:

1. `prd.json` - PRD items extracted from your description
2. `progress.txt` - Empty file for tracking between iterations
3. `PROMPT.md` - Prompt template with @-references
4. `ralph-once.sh` - Single iteration script (HITL)
5. `ralph.sh` - Autonomous loop script (AFK)

## Usage

**HITL (Human In The Loop):**

```bash
./ralph-once.sh
# Review changes, then run again
./ralph-once.sh
```

**AFK (Autonomous):**

```bash
./ralph.sh        # Default 10 iterations
./ralph.sh 20     # Custom max iterations
```

## Requirements

-   Docker Desktop 4.58+ with Docker Sandbox feature enabled
