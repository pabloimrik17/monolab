## Context

monolab has 17 project-level skills (openspec + nx), all managed manually. No skills.sh skills are installed (no `skills-lock.json` exists). The `experiments` plugin (v0.2.1) has 2 commands but 0 skills — this will be the first.

The skills.sh CLI (`skills@1.4.5`) supports: `add`, `remove`, `list --json`, `check`, `update`, `experimental_install` (restore from lock file). Installation via `npx`/`bunx`, no local dep.

## Goals / Non-Goals

**Goals:**
- Skill that detects the project stack and proposes/installs relevant skills.sh skills
- Maintain a curated stack→skills mapping embedded in the skill
- Ensure a `postinstall` script for persistence across installs
- Project-level scope for all installations

**Non-Goals:**
- Global skills (`-g`) — out of scope
- Duplicate detection against Claude Code plugins — the user manages this
- External config file (`.skills-terraform.yml`) — the list lives inside the skill
- Automatic installation without confirmation — the skill proposes, Claude confirms

## Decisions

### D1: Skill, not Hook nor Command

The skill is activated automatically via "using-superpowers" at session start. A hook cannot ask for interactive confirmation. A command requires manual invocation.

**Rejected alternatives:**
- SessionStart hook: non-interactive, blocks startup
- Command (`/experiments:skill-terraformer`): requires the user to remember to invoke it

### D2: Curated list embedded in SKILL.md

The detector→skills mapping lives directly in the skill's markdown. Initial curated list:

| Condition | Repo | Skill |
|-----------|------|-------|
| `react` in dependencies/devDependencies | `vercel-labs/agent-skills` | `vercel-react-best-practices` |
| `react` in dependencies/devDependencies | `vercel-labs/agent-skills` | `vercel-composition-patterns` |
| `react` in dependencies/devDependencies + `components.json` | `shadcn/ui` | `shadcn` |
| `next` in dependencies/devDependencies | `vercel-labs/next-skills` | `next-best-practices` |
| frontend (universal) | `vercel-labs/agent-skills` | `web-design-guidelines` |
| frontend (universal) | `anthropics/skills` | `frontend-design` |

Template: `bunx skills add <Repo> --skill <Skill> --agent claude-code -y`
Batch per repo with multiple `--skill` flags.

**Rejected alternative:** Separate config file — adds complexity with no benefit for a single project.

### D3: `experimental_install` in postinstall

The postinstall script uses `bunx skills experimental_install`, which restores skills from `skills-lock.json`. Both commands (`update` and `experimental_install`) require the lock file — without it they do nothing. This is why the lock file **must be committed** for it to work on fresh clones.

`experimental_install` is preferable to `update` because it restores the exact versions from the lock file instead of updating to latest.

**Postinstall format (with graceful degradation):**
```json
"postinstall": "[ -f skills-lock.json ] && bunx skills experimental_install || true"
```

Only runs if the lock file exists. If it fails, it does not block `pnpm install`.

If a postinstall already exists, it is chained with `&&`, isolating the fallback:
`<existing-postinstall> && ( [ -f skills-lock.json ] && bunx skills experimental_install || true )`.
The parentheses limit `|| true` to the skills part, without masking failures from the original postinstall.

### D4: Skill flow

```
1. Read project indicators (package.json, nx.json, configs)
2. Evaluate curated rules → list of applicable skills
3. bunx skills list --json → already-installed skills
   (If it fails: report error, ask the user for confirmation before continuing)
4. Diff: applicable - installed = pending
5. For each pending: bunx skills add <repo> --skill <name> --agent claude-code -y
6. If ≥1 skill was installed (now or before): verify postinstall in package.json
7. If postinstall is missing: propose adding it
```

### D5: Target agent `claude-code`

All skills are installed with `--agent claude-code` since it is the only agent in use in monolab.

## Risks / Trade-offs

- **[Startup slowness]** → `bunx skills list --json` and stack detection are fast. `skills add` only runs if there are pending skills.
- **[CLI changes experimental_install]** → It is experimental. Mitigation: if it fails, warn the user to install manually from the lock file instead of silently degrading to `skills update` (which does not restore from a lock file).
- **[Curated list goes stale]** → Acceptable: updating the skill is trivial. Better than over-engineering a config system.
- **[skills-lock.json in git]** → Must be committed for `experimental_install` to work on fresh clones. Similar to package lock files.
