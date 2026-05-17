# Implementation Tasks

## 1. Scaffolding

- [x] 1.1 Create `claude-plugins/experiments/commands/commander-update.md` skeleton with YAML frontmatter (`description`)
- [ ] 1.2 Verify the command is discovered by Claude Code (`/experiments:commander-update` appears in slash-command list)

## 2. Registry Contract Block (inside the command file)

- [x] 2.1 Document the new `update(name, patch)` operation alongside existing `read` / `list` / `getByName` / `add` / `delete` (reference `commander-add.md` for path / lazy create / schema / record shape / read behaviour / atomic recipe / JSON formatting — do not duplicate)
- [x] 2.2 Document missing-file behaviour: `update` SHALL fail with `"no projects registered"` and SHALL NOT create the file
- [x] 2.3 Document empty-registry behaviour: `projects: {}` is treated the same as missing file
- [x] 2.4 Document unknown-name rejection: fail with `"project '<name>' is not registered"` and leave the file unchanged
- [x] 2.5 Document non-editable-field rejection: fail with `"field '<name>' is not editable"` for any patch key outside `{ keywords, description, specialRules, repoType }`
- [x] 2.6 Document invalid-`repoType` rejection: fail with `"invalid repoType: <value>"` for values outside the enum
- [x] 2.7 Document successful-update recipe: read → apply patch → preserve `createdAt` byte-equivalent → set `updatedAt` to now (UTC ISO-8601) → atomic temp-write + rename, preserving `version` and `projects` insertion order
- [x] 2.8 Document the legacy-v1 backfill case: `update(name, { repoType: "<enum>" })` against a record without `repoType` SHALL persist the field in place with the rest of the record byte-equivalent

## 3. Argument Parsing (Priority A)

- [x] 3.1 Parse `ARGUMENTS` for an explicit target name: first positional argument or `--name <value>`
- [x] 3.2 Parse the editable-field flags: `--keywords <csv>`, `--description <text>`, `--rules <csv>`, `--repo-type <enum>`
- [x] 3.3 Parse the `--refresh` boolean flag (no value)
- [x] 3.4 Reject any other flag with `"unknown flag: <flag>"` before any read or write
- [x] 3.5 If a name is supplied, look it up directly via `getByName` and skip the interactive picker; on miss, abort with `"project '<name>' is not registered"`
- [x] 3.6 Validate `--repo-type <enum>` value against `{ single-repo, monorepo, multi-monorepo }` at parse time; abort with `"invalid repoType: <value>"` on miss
- [x] 3.7 Split / lowercase / trim `--keywords` and `--rules` csv inputs into string arrays; deduplicate

## 4. Interactive Picker (Priority B for target)

- [x] 4.1 When no name is supplied, call `list()` to enumerate projects
- [x] 4.2 If `list()` is empty (or registry missing), print `"no projects registered"` and exit cleanly without prompting
- [x] 4.3 Otherwise present registered projects via `AskUserQuestion`, one option per project, with a final explicit `"Cancel"` option; option label is `<name> — <path>` (truncate `path` if needed for readability)
- [x] 4.4 If the user picks `"Cancel"` (or aborts the prompt), exit with `"update cancelled"` and no write

## 5. Field-Pick Menu (initial entry to Priority C / B-refresh)

- [x] 5.1 If no editable-field flags were supplied AND `--refresh` was not supplied, render a single `AskUserQuestion` listing the editable fields plus `"Re-scan via Haiku"`, `"Save (no changes)"`, and `"Abort"`
- [x] 5.2 If at least one editable-field flag was supplied, skip the field-pick menu on first entry and go directly to Step 7 (diff render); the field-pick menu becomes accessible again via the `"Edit"` option at confirmation
- [x] 5.3 If `--refresh` was supplied, run Step 6 (Haiku re-scan) before Step 7 (diff render), regardless of whether any editable-field flag was also supplied

## 6. Haiku Re-Scan (Priority B for field values, opt-in)

- [x] 6.1 Dispatch the Haiku subagent against the record's current `path` using the same prompt as `commander-add` Step 2
- [x] 6.2 Apply the same tolerant-recovery + single re-dispatch parsing rules as `commander-add` Step 2 "Parse the response"
- [x] 6.3 If parsing succeeds, overwrite the in-memory proposed values for `keywords`, `description`, `specialRules` (only for fields not supplied by Priority A)
- [x] 6.4 Do NOT auto-change `repoType` from the re-scan — re-classification against an unchanged `path` is rarely the user's intent; user must edit `repoType` explicitly if desired
- [x] 6.5 Run the `commander-normalize` skill on the resolved `keywords` (passing the resolved `repoType` and a `subprojects` shape consistent with the record) — unless Priority A supplied `--keywords` (bypass)
- [x] 6.6 Remember `droppedTerms` from normalize for Step 9

## 7. Diff Render

- [x] 7.1 Compute the diff between the current record and the proposed record
- [x] 7.2 Include only fields whose normalized proposed value differs from the current value
- [x] 7.3 Render `keywords` and `specialRules` as sorted lists per side with `+`/`–` markers on added/removed entries
- [x] 7.4 Render `description` as the literal old → new strings
- [x] 7.5 Render `repoType` as `<current> → <proposed>`, substituting `"(none — legacy v1 record)"` for an absent current value, and annotating that row with `← drift backfill`
- [x] 7.6 If the diff is empty (every resolved field matches its current value), print `"no changes"` and exit without writing — do NOT bump `updatedAt`

## 8. Confirmation Gate (Save / Edit / Abort)

- [x] 8.1 Render the diff (Step 7 output)
- [x] 8.2 Prompt via `AskUserQuestion` with three options: `"Save"`, `"Edit"`, `"Abort"`; copy frames `"Abort"` as the safe default
- [x] 8.3 On `"Edit"`, present the editable field list (same options as Step 5.1) and re-enter Priority C (`AskUserQuestion`) for the selected field — pre-fill question copy with the current value
- [x] 8.4 After an edit, re-run normalize on `keywords` if the edited field was `keywords` and Priority A was not in play; recompute the diff (Step 7) and re-present the confirmation prompt
- [x] 8.5 On `"Abort"` (or any abort/cancellation), exit with `"update cancelled"` and no write
- [x] 8.6 Only proceed to Step 9 on explicit `"Save"` selection

## 9. Atomic Update Write

- [x] 9.1 `Read` the current registry from `<HOME>/.claude/commander/projects.json`
- [x] 9.2 Defensive check: if the file is missing OR `projects[name]` no longer exists (race with another process / hand edit), abort with the matching error (`"no projects registered"` or `"project '<name>' is not registered"`) and exit without writing
- [x] 9.3 Build the patched record: apply the resolved patch on top of the current record, preserving `createdAt` byte-equivalent, setting `updatedAt` to the current UTC ISO-8601 timestamp
- [x] 9.4 Reject the patched record if `repoType` is now present and not in the enum (defensive — should be unreachable through normal flow)
- [x] 9.5 Replace `projects[name]` with the patched record in place (preserve insertion order — do not delete-then-insert)
- [x] 9.6 Serialize with 2-space indent and trailing newline; preserve the existing `version` value verbatim
- [x] 9.7 `Write` the serialized content to `<HOME>/.claude/commander/projects.json.tmp` (overwrite any pre-existing temp)
- [x] 9.8 `Bash mv "<HOME>/.claude/commander/projects.json.tmp" "<HOME>/.claude/commander/projects.json"` to commit atomically
- [x] 9.9 Surface a concise success message: `Updated "<name>" (<changed-field-list>).`
- [x] 9.10 On any failure between 9.7 and 9.8, remove the leftover temp via `rm -f "<HOME>/.claude/commander/projects.json.tmp"`

## 10. Vocabulary Suggestion (reuse Step 7 from commander-add)

- [x] 10.1 Run only after Step 9 succeeds AND `keywords` was edited via Haiku or `AskUserQuestion` (NOT when `--keywords` was supplied)
- [x] 10.2 Skip entirely when `droppedTerms` is empty, OR when the session-skip flag is set, OR when `gh` is not on `PATH` (detect via `command -v gh >/dev/null 2>&1`)
- [x] 10.3 Otherwise present the same three-option `AskUserQuestion` as `commander-add` Step 7: `Yes` (open issue via `gh issue create`), `No` (dismiss), `Skip session` (set session flag, dismiss)
- [x] 10.4 The session-skip flag SHALL be shared with `commander-add` (in-conversation memory, not persisted)
- [x] 10.5 On `gh` non-zero exit, surface stderr to the user but do NOT roll back the registry write

## 11. Plugin Metadata

Target version for this change: `0.11.0` (minor bump from current `0.10.0` — new command is additive). Versions are driven by release-please from conventional commits; do NOT manually edit `plugin.json`, `package.json`, or `marketplace.json` — the commit message format below carries the bump.

- [x] 11.1 Add `commander-update` to `claude-plugins/experiments/README.md` under the current-experiments list (if it enumerates them)
- [x] 11.2 Use a `feat(experiments):` conventional-commit prefix on the implementation commit so release-please produces a minor bump
- [ ] 11.3 After merge, verify the three version strings remain aligned via the same `jq` check used by sibling tickets: `jq -r '.version' claude-plugins/experiments/.claude-plugin/plugin.json claude-plugins/experiments/package.json && jq -r '.plugins[] | select(.name=="experiments") | .version' .claude-plugin/marketplace.json` — three printed values MUST be identical

## 12. Manual Verification

- [ ] 12.1 Invoke `/experiments:commander-update` with no args and an empty/missing registry; confirm `"no projects registered"` and no file created
- [ ] 12.2 Pre-seed two projects via `commander-add`; invoke `/experiments:commander-update <name>` for one with `--description "new desc"`; confirm diff shows only `description`, save succeeds, other record byte-equivalent, `createdAt` preserved, `updatedAt` refreshed
- [ ] 12.3 Invoke `/experiments:commander-update <unknown-name>`; confirm abort with `"project '<name>' is not registered"` and file unchanged
- [ ] 12.4 Invoke `/experiments:commander-update` with no args on populated registry; confirm picker shows all projects + `"Cancel"`
- [ ] 12.5 At the confirmation prompt, select `"Abort"`; confirm registry unchanged and `"update cancelled"` exit
- [ ] 12.6 Edit `keywords` interactively (no `--keywords` flag); confirm `commander-normalize` is invoked, diff shows sorted `+`/`–` markers, vocab suggestion prompt appears if `droppedTerms` non-empty and `gh` available
- [ ] 12.7 Pass `--keywords "react,foo-internal"`; confirm raw list persisted verbatim, normalize NOT invoked, vocab suggestion suppressed
- [ ] 12.8 Pass `--refresh` against a registered project; confirm Haiku is dispatched once, diff renders detected vs. current values, `repoType` is not auto-changed
- [ ] 12.9 Pass `--repo-type foo`; confirm abort with `"invalid repoType: foo"` and no further prompt
- [ ] 12.10 Hand-craft a legacy v1 record in `projects.json` (record without `repoType`); invoke `/experiments:commander-update <name> --repo-type single-repo`; confirm diff row shows `"(none — legacy v1 record)" → "single-repo" ← drift backfill`, save persists `repoType` in place, rest of record byte-equivalent
- [ ] 12.11 Invoke `/experiments:commander-update <name>` with no edit flags and no edits at confirmation (Save immediately); confirm `"no changes"` exit and `updatedAt` NOT bumped on disk
- [ ] 12.12 Simulate mid-write interruption (kill between temp-write and rename); confirm `projects.json` intact with pre-update record still present
- [ ] 12.13 Inspect the resulting JSON after a successful update: 2-space indent, trailing newline, `version` unchanged, key insertion order preserved, fields outside the patch byte-equivalent
