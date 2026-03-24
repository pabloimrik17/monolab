---
name: skills-update-check
description: Check for available updates to globally-installed skills.sh skills at session start. Detects package runner, runs skills check -g, and offers to update if needed. Execute once per session only.
---

# Skills Update Check

Check for updates to globally-installed skills.sh skills. Run this **once per session** — do not re-run if already executed.

## Once-Per-Session Guard

Before running the check, review your conversation context for any prior `skills check -g` output. If you already ran this check earlier in this session, **skip** — do not re-run.

## Package Runner Detection

Detect the runner using lockfile priority, then global binary, then fallback:

| Priority | Condition                        | Runner |
| -------- | -------------------------------- | ------ |
| 1        | `bun.lockb` or `bun.lock` exists | `bunx` |
| 2        | `pnpm-lock.yaml` exists          | `pnpx` |
| 3        | `yarn.lock` exists               | `npx`  |
| 4        | `package-lock.json` exists       | `npx`  |
| 5        | `command -v bun` succeeds        | `bunx` |
| 6        | `command -v pnpm` succeeds       | `pnpx` |
| 7        | fallback                         | `npx`  |

Check lockfiles in the current working directory first. Only fall through to global binary detection if no lockfile matches.

## Update Check Workflow

Run the check in background (non-blocking):

```bash
<runner> skills check -g
```

Handle three output states:

### Updates Available

If the output lists skills with available updates:

1. Present the update list to the user
2. Ask: "Would you like to update your global skills?"
3. If **yes** → run `<runner> skills update -g`
4. If **no** → skip, continue the session

### All Up to Date

If the output indicates no updates available (e.g., contains "already at the latest"):

> Global skills up to date.

### No Global Skills Installed

If the output contains "No skills tracked":

> No global skills.sh skills are installed. You can install skills with:
>
> ```bash
> <runner> skills add -g <package>
> ```
