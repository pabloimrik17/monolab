---
name: skill-terraformer
description: Auto-detect project stack and install missing skills.sh skills on session start. Detects react, next, shadcn, and other frontend stacks, installs applicable skills, and ensures postinstall persistence.
---

# Skill Terraformer

Detect the project's tech stack, compare against a curated skills manifest, install missing skills from skills.sh, and ensure postinstall persistence.

## Step 1: Detect Project Stack

Read the project's `package.json` (root) and check for these signals:

| Signal    | How to detect                                                | Tag        |
| --------- | ------------------------------------------------------------ | ---------- |
| React     | `react` in dependencies or devDependencies                   | `react`    |
| Next.js   | `next` in dependencies or devDependencies                    | `next`     |
| shadcn/ui | `react` in deps AND `components.json` exists in project root | `shadcn`   |
| Vue       | `vue` in dependencies or devDependencies                     | `vue`      |
| Svelte    | `svelte` in dependencies or devDependencies                  | `svelte`   |
| Nx        | `nx.json` exists in project root                             | `nx`       |
| Expo      | `expo` in dependencies or devDependencies                    | `expo`     |
| Vite      | `vite` in dependencies or devDependencies                    | `vite`     |
| Solid.js  | `solid-js` in dependencies or devDependencies                | `solid-js` |
| Angular   | `@angular/core` in dependencies or devDependencies           | `angular`  |

**Frontend universal**: If ANY of `react`, `next`, `vue`, `svelte`, `solid-js`, `angular` is detected, the project is a frontend project (tag: `frontend`).

Collect all matching tags into a set.

## Step 2: Curated Skills Manifest

Map detected tags to applicable skills:

| Condition  | Repo                       | Skill                         | Install command                                                                                       |
| ---------- | -------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------- |
| `react`    | `vercel-labs/agent-skills` | `vercel-react-best-practices` | `bunx skills add vercel-labs/agent-skills --skill vercel-react-best-practices --agent claude-code -y` |
| `react`    | `vercel-labs/agent-skills` | `vercel-composition-patterns` | `bunx skills add vercel-labs/agent-skills --skill vercel-composition-patterns --agent claude-code -y` |
| `shadcn`   | `shadcn/ui`                | `shadcn`                      | `bunx skills add shadcn/ui --skill shadcn --agent claude-code -y`                                     |
| `next`     | `vercel-labs/next-skills`  | `next-best-practices`         | `bunx skills add vercel-labs/next-skills --skill next-best-practices --agent claude-code -y`          |
| `frontend` | `vercel-labs/agent-skills` | `web-design-guidelines`       | `bunx skills add vercel-labs/agent-skills --skill web-design-guidelines --agent claude-code -y`       |
| `frontend` | `anthropics/skills`        | `frontend-design`             | `bunx skills add anthropics/skills --skill frontend-design --agent claude-code -y`                    |

When multiple skills come from the same repo, batch them:

```bash
bunx skills add vercel-labs/agent-skills --skill vercel-react-best-practices --skill vercel-composition-patterns --skill web-design-guidelines --agent claude-code -y
```

Evaluate all conditions against the detected tags. Collect the set of **applicable skills**.

If no conditions match, report "No applicable skills detected for this project's stack" and stop.

## Step 3: Query Installed Skills

Run:

```bash
bunx skills list --json
```

Parse the JSON output to get the list of already-installed skill names.

**If skills are installed but `skills-lock.json` does not exist:** Warn: "Skills are installed but `skills-lock.json` is missing. Run `bunx skills update` to generate it, then commit the file."

**If the command fails or returns invalid JSON:**

- Report: "Could not query installed skills — `bunx skills list --json` failed."
- Mark detection state as **unknown**.
- Do NOT assume all applicable skills are pending.
- Ask the user for confirmation before attempting any installations.

## Step 4: Diff — Find Pending Skills

Compare: **applicable skills** minus **already-installed skills** = **pending skills**.

- If no pending skills: report "All applicable skills already installed." and skip to Step 6.
- If pending skills exist: list them and proceed to installation.

## Step 5: Install Pending Skills

For each pending skill (or batched by repo):

```bash
bunx skills add <repo> --skill <name> --agent claude-code -y
```

**Error handling:** If an installation command fails:

- Report the failure (skill name + error).
- Continue with remaining skills.
- Do not abort the entire flow.

Track how many skills were installed successfully vs. failed.

## Step 6: Postinstall Management

**Only proceed if skills are managed** (at least one skill.sh skill is installed, either from this session or previously).

### 6a. Check existing postinstall

Read the root `package.json` and check `scripts.postinstall`.

### 6b. Apply postinstall logic

The postinstall command to ensure is:

```bash
[ -f skills-lock.json ] && bunx skills experimental_install || true
```

**No `postinstall` script exists:** Propose adding `"postinstall": "[ -f skills-lock.json ] && bunx skills experimental_install || true"`.

**`postinstall` exists but does NOT contain `skills experimental_install`:** Propose appending `&& ( [ -f skills-lock.json ] && bunx skills experimental_install || true )` to existing script. Parentheses isolate the fallback so `|| true` doesn't mask failures from the original postinstall.

**`postinstall` already contains `skills experimental_install`:** No changes needed.

### 6c. Lock file advisory

If `skills-lock.json` was created or updated during this session, advise:

> `skills-lock.json` should be committed to version control. Without it, `bunx skills experimental_install` cannot restore skills on fresh clones.
