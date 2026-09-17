---
description: Ask the run knowledge base what it already knows about one package — hits by match class, or a hub's persisted ranges — without opening a note body
argument-hint: <pkg> [<from> <to>]
---

# knowledge-recall

Reads the run knowledge base for one package, entirely through `match-knowledge.mjs` and the frontmatter of its package hub. Never opens a run note, a hub section body or a raw run artefact.

## Invocation

```text
/experiments:knowledge-recall <pkg> [<from> <to>]
```

Split `$ARGUMENTS` on whitespace. One token is `<pkg>` alone; three tokens are `<pkg> <from> <to>`. Zero tokens, two tokens, or more than three all take the usage path below.

## Missing `<pkg>`, or any other argument count

Print `Usage: /experiments:knowledge-recall <pkg> [<from> <to>]` and stop — do not consult the base.

## Step 1 — resolve the root, once

```bash
KNOWLEDGE_ROOT="${user_config.knowledge_root}" node -e "import('${CLAUDE_PLUGIN_ROOT}/scripts/lib/knowledge.mjs').then(m => process.stdout.write(m.resolveKnowledgeRoot()))"
```

Check `<root>`. When it is missing, print `Knowledge: no base at <root>` and stop. This is not an error — no stack trace, no script invocation echoed. A missing `index.json` is a cache miss: the ranged form's matcher rebuilds it before matching, while the package-only form reads the durable hub directly.

## Step 2 — dispatch on argument form

**`<pkg> <from> <to>`** — build a one-package synthetic group and run the matcher:

```bash
printf '%s' '{"groups":[{"groupId":"recall-1","bucketKey":"recall","packages":[{"name":"<pkg>","from":"<from>","to":"<to>"}]}]}' \
  | KNOWLEDGE_ROOT="${user_config.knowledge_root}" node ${CLAUDE_PLUGIN_ROOT}/scripts/match-knowledge.mjs --groups -
```

The matcher owns the class conditions, `delta`, the `synthetic`/`draft` exclusions and the one-hit-per-package preference order — its `hits[]` is the verdict, taken as-is.

- A hit for `<pkg>` exists: print it under its `class`, with `<from> → <to>`, `delta` (only for `overlap`), `hubPath`, `anchor` and `notePath`. Print nothing else — never the hub section or note body those paths point to.
- No hit: go to Step 3, and prefix its output with one line, `Knowledge: <pkg> <from> → <to> — no hit`.

**`<pkg>` alone** — do not run the matcher. Go straight to Step 3.

## Step 3 — hub lookup by frontmatter

Compute the hub path, never through the matcher:

```bash
KNOWLEDGE_ROOT="${user_config.knowledge_root}" node -e "import('${CLAUDE_PLUGIN_ROOT}/scripts/lib/knowledge.mjs').then(m => process.stdout.write(m.pkgSlug(process.argv[1])))" "<pkg>"
```

Check `<root>/packages/<slug>.md`:

- Missing: print `Knowledge: no entry for <pkg>` and stop. No ranges table — there is no hub to read.
- Present: read its frontmatter and print `ranges`, `runs` and `latest` as a table. For the `<pkg>`-alone form this table is the whole output; for the `<pkg> <from> <to>` form reaching this step with no hit, it follows the "no hit" line from Step 2.

Never print past the frontmatter — no `### Universal`, no `### Applied`, no `### Summary`.

## Hard rules

- Delegate every match-class condition, the staleness rule and the exclusions to `match-knowledge.mjs`; never restate them here.
- Print only paths, match classes and frontmatter-derived tables — never a note body, a hub section body or a raw run artefact.
- Write nothing. The matcher's own index rebuild, inside the knowledge root, is the only disk write this command can cause.
- Never report an absent base, an unknown package or a no-hit range as an error.

## See also

- `match-knowledge.mjs` — the classifier this command's ranged form runs.
- `recall-run-knowledge` — the same matcher, invoked automatically inside a deep run.
- `/experiments:knowledge-persist` — the write side.
