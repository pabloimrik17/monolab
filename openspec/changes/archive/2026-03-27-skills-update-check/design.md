## Context

The `experiments` plugin (`claude-plugins/experiments/`) currently has only commands (`hello-experiments`, `ralph`). No `skills/` directory exists yet.

Users install global skills via `npx skills add -g <package>`. The `skills` CLI (from skills.sh / `vercel-labs/skills`) tracks installed skills in a `skills-lock.json` and can check for updates via `skills check -g`. However, nobody runs this manually.

The skill runs inside Claude Code sessions where the available package runner varies by project (bun, pnpm, npm) or global installation.

## Goals / Non-Goals

**Goals:**
- Automatically check for global skills.sh updates once per session, non-blocking
- Present findings to user and offer to update if applicable
- Detect and use the correct package runner for the session context
- Handle edge case: no global skills installed

**Non-Goals:**
- Project-level skills update checking (only global/user-level)
- Multi-agent support beyond Claude Code (future: OpenCode, others)
- Auto-updating without user confirmation
- Hook-based implementation (reserved as fallback if skill approach has latency issues)

## Decisions

### D1: Skill over Hook

**Choice**: Implement as a skill, not a SessionStart hook.

**Rationale**: `skills check -g` takes 2-3s (npm package download + git check). A SessionStart hook would block every session start. A skill runs in Claude's background processing — non-blocking, and the check result only matters infrequently (most sessions will be "all up to date").

**Alternative considered**: SessionStart hook — guaranteed 1x execution but adds latency to every session. Noted as fallback if needed.

### D2: Package runner detection priority

**Choice**: Local lockfile → global binary → fallback `npx`.

```
1. bun.lockb / bun.lock  → bunx
2. pnpm-lock.yaml         → pnpx
3. yarn.lock               → npx (yarn dlx unreliable across versions)
4. package-lock.json       → npx
5. command -v bun          → bunx
6. command -v pnpm         → pnpx
7. fallback                → npx
```

**Rationale**: Lockfile presence is the most reliable indicator of project intent. Global binary check handles cases with no project context (e.g., opening Claude Code in home dir).

### D3: Once-per-session via temp file guard

**Choice**: Use a session-scoped temp file (`/tmp/skills-check-<session-id>`) as a guard. The skill checks for the file before running; if it exists, skip. After successful execution, create the file.

**Rationale**: Prompt-only instructions ("do not repeat") are non-deterministic — the LLM may forget or re-trigger across long conversations. A temp file is a concrete, reliable mechanism that survives context compaction.

**Fallback**: If session-id is unavailable, use a per-day file (`/tmp/skills-check-<date>`) to limit to once daily.

### D4: Three output states

| `skills check -g` output | Interpretation | Action |
|---|---|---|
| Contains update listings | Updates available | Ask user to confirm `<runner> skills update -g` |
| Clean output, no updates | All up to date | Brief "Global skills up to date" message |
| "No skills tracked" | No global skills.sh installs | Inform user, suggest `<runner> skills add -g` |

## Risks / Trade-offs

- **[Latency]** `npx skills check -g` downloads package on first run per session → Mitigation: skill runs in background, doesn't block user interaction. Bun/pnpm cache mitigates for subsequent runs.
- **[LLM reliability]** Skill may not trigger every session → Mitigation: acceptable — update checks are nice-to-have, not critical. If reliability becomes important, migrate to hook.
- **[CLI changes]** `skills` CLI output format may change → Mitigation: parse output loosely, rely on presence of keywords ("No skills tracked", "already at the latest") rather than exact format.
- **[No global runner]** If neither bun, pnpm, nor npm are available → Mitigation: extremely unlikely in a Claude Code session. Fallback to `npx` which comes with Node.
