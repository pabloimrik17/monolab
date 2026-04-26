# Design: `commander-delete`

## Context

`commander-add` (MON-129) defined the registry path, schema (v2), and the `add(record)` write contract. The same registry now needs an inverse: remove a single record by name. The constraints from MON-128/MON-129 still apply — no runtime code, command is a Markdown file dispatching built-in tools, atomic writes via temp + rename, no lockfile.

This change is small and could fit inline in the proposal, but two decisions warrant a design doc: how to resolve the deletion target (explicit vs. interactive) and how the confirmation is shaped to avoid accidental data loss.

## Goals / Non-Goals

**Goals**
- Remove one project record by `name` without disturbing the rest of the registry.
- Make accidental deletion difficult: confirmation must be explicit and default to cancel.
- Reuse the `commander-add` atomic-write recipe; no new persistence primitives.
- Stay shippable as a single Markdown command.

**Non-Goals**
- Bulk deletion or deletion by predicate (`--all`, `--matching`, `--older-than`). Out of scope.
- Soft delete / undo. The registry has no history; restoring would mean replaying `add`.
- Schema changes. The file format stays at v2.
- Cross-invocation locking. Same YAGNI as MON-129.
- Deleting external state (project files on disk, git remotes, etc.). The command edits the registry only.

## Decisions

### Decision 1 — Target resolution priority A → B

- **A) Explicit name**: first positional argument or `--name <value>` from `ARGUMENTS`. If supplied and matches a registered project, skip B and go straight to confirmation.
- **B) Interactive pick**: when no name is supplied, call `list()` and present the projects via `AskUserQuestion` (one question, one option per project, plus an explicit "cancel" option). The user's pick becomes the target.

**Why this priority:** mirrors the user mental model from `commander-add` (A→B→C) and matches MON-130's spec ("recibe el nombre del proyecto"). Explicit args are the fast path; interactive is the discovery path.

**Why no Haiku here:** there is no inference to do. The name is either provided or chosen from a finite known list.

**Edge case:** registry is empty (file missing, or `projects` object empty). The command SHALL print "no projects registered" and exit cleanly without prompting.

### Decision 2 — Mandatory confirmation, default = cancel

Before any write, render the targeted record (`name`, `path`, `description`) and ask the user to confirm via `AskUserQuestion`. Provide two options: "Delete" and "Cancel". The question copy SHALL make "Cancel" the obvious default in the prose; the tool itself does not enforce a default option, so the prompt wording carries the safety.

**Why:** deletion is destructive and unrecoverable. A single misclick on Auto mode should not lose curated metadata. Showing the full record (not just `name`) lets the user spot a typo before it bites.

**Rejected alternative:** `--yes` / `--force` flag to skip confirmation. Adds surface area for very little benefit (no scripted use case for `commander:*` today). Defer until a real user asks.

### Decision 3 — `delete(name)` registry operation

Add a single new operation to the registry contract:

1. Read the registry. If the file is missing, treat as empty and return a "no projects registered" error.
2. If `name` is not a key in `projects`, return "project '<name>' is not registered" without writing.
3. Otherwise remove the key from `projects`, update no other field (no `updatedAt` on the registry itself — none exists), and persist atomically (temp + rename).
4. Return the removed record (for the success message).

**Why same atomic recipe:** the `add` flow already proved out write-temp-then-rename. Reusing it keeps the contract uniform and lets a future Commander runtime implement both ops with a shared helper.

**Why not also clear `~/.claude/commander/` when the registry is empty:** keeping the file (with `version: 2, projects: {}`) is harmless and avoids re-creating the directory next time. The empty-file case already works for reads.

### Decision 4 — Error surface

Three error conditions, all must produce a clear user-facing message and SHALL NOT modify the file:

- Registry missing or empty → "no projects registered".
- Name not found → "project '<name>' is not registered".
- Unsupported registry version (forward-compat with v3+) → reuse the same abort behavior already specified in `commander-registry`.

User cancellation at the confirmation step is not an error; the command exits with a neutral message ("deletion cancelled").

### Decision 5 — Stay in `experiments`, version bump 0.7.0 → 0.8.0

Same plugin as `commander-add`. Minor bump because we are adding a new command (additive). Ensure all three version strings (`plugin.json`, `package.json`, `marketplace.json[experiments]`) remain aligned.

## Risks / Trade-offs

- **Auto mode skips confirmations the user never sees** → record deleted unintentionally. *Mitigation:* the `AskUserQuestion` call is the gate; Auto mode still routes through it. Prompt copy emphasizes irreversibility. If this still feels thin in practice, revisit (e.g., require typing the project name to confirm).
- **Concurrent `commander:add` + `commander:delete` interleaving** → possible lost write on the same registry. *Mitigation:* same as MON-129 — out of scope; single user, sequential invocations assumed.
- **Stale `monorepoRoot` reference elsewhere** → not a real risk because no other state references the registry.
- **User typos on the explicit name path** → command refuses unknown names; user re-runs without `--name` to use the picker.

## Migration Plan

No migration. New command, no schema changes. Rollback = revert the four touched files; on-disk registries written before/after this change remain compatible because the file format is unchanged.

## Open Questions

- Should the picker show `description` next to each option to help disambiguate when names look alike? Leaning yes; punt to implementation if `AskUserQuestion` makes per-option descriptions awkward.
- Should we offer `--dry-run` to preview without writing? Probably not worth it for a single-record op; revisit if/when bulk delete lands.
