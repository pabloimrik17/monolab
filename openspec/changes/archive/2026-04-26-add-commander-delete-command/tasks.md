# Implementation Tasks

## 1. Scaffolding

- [x] 1.1 Create `claude-plugins/experiments/commands/commander-delete.md` skeleton with YAML frontmatter (`description`)
- [x] 1.2 Verify the command is discovered by Claude Code (`/experiments:commander-delete` appears in slash-command list)

## 2. Registry Contract Update (inside the command file)

- [x] 2.1 Document the new `delete(name)` operation alongside the existing `read` / `list` / `getByName` / `add` contract
- [x] 2.2 Document missing-file behaviour: `delete` SHALL fail with "no projects registered" and SHALL NOT create the file
- [x] 2.3 Document empty-registry behaviour: `projects: {}` is treated the same as missing file
- [x] 2.4 Document unknown-name rejection: fail with `"project '<name>' is not registered"` and leave the file unchanged
- [x] 2.5 Document successful-delete recipe: read → remove key from `projects` → atomic temp-write + rename, preserving the existing `version` value
- [x] 2.6 Document JSON formatting rule reuse: 2-space indent, trailing newline, no field reordering on remaining records

## 3. Argument Parsing (Priority A)

- [x] 3.1 Parse `ARGUMENTS` for an explicit target name: first positional argument or `--name <value>`
- [x] 3.2 If a name is supplied, look it up directly via `getByName` and skip the interactive picker
- [x] 3.3 If the supplied name is not registered, abort with `"project '<name>' is not registered"`

## 4. Interactive Picker (Priority B)

- [x] 4.1 When no name is supplied, call `list()` to enumerate projects
- [x] 4.2 If `list()` is empty (or registry missing), print "no projects registered" and exit cleanly without prompting
- [x] 4.3 Otherwise present registered projects via `AskUserQuestion`, one option per project, with a final explicit "cancel" option
- [x] 4.4 Include enough context per option (at minimum `name`; ideally a short suffix with `path` or `description`) to disambiguate similar names
- [x] 4.5 If the user picks "cancel" (or aborts the prompt), exit with a neutral message and no write

## 5. Confirmation

- [x] 5.1 Render the targeted record's `name`, `path`, and `description` before any write
- [x] 5.2 Prompt with `AskUserQuestion` offering two options: "Delete" (destructive) and "Cancel" (default in copy)
- [x] 5.3 The prompt copy SHALL state that deletion is irreversible
- [x] 5.4 On "Cancel" or abort, exit with "deletion cancelled" and no write
- [x] 5.5 Only proceed to the write step on explicit "Delete" selection

## 6. Atomic Delete

- [x] 6.1 `Read` the current registry; if missing/empty, fall back to the empty-registry path (defensive — should be caught earlier)
- [x] 6.2 Remove the target key from `projects`
- [x] 6.3 Serialize with 2-space indent and trailing newline; preserve the current `version` value
- [x] 6.4 `Write` to `~/.claude/commander/projects.json.tmp`
- [x] 6.5 `Bash mv ~/.claude/commander/projects.json.tmp ~/.claude/commander/projects.json` to commit atomically
- [x] 6.6 Surface a concise success message quoting the removed `name` and `path`

## 7. Plugin Metadata

Target version for this change: **`0.8.0`** (minor bump from the current `plugin.json` / `package.json` / marketplace value of `0.7.0`).

- [x] 7.1 Set `claude-plugins/experiments/.claude-plugin/plugin.json` version to `0.8.0`
- [x] 7.2 Set `claude-plugins/experiments/package.json` version to `0.8.0`
- [x] 7.3 Set the `experiments` entry in `.claude-plugin/marketplace.json` to `0.8.0`
- [x] 7.4 Update `claude-plugins/experiments/README.md` to mention `commander-delete` under current experiments (if the README enumerates them)
- [x] 7.5 Verify all three version strings match by running: `jq -r '.version' claude-plugins/experiments/.claude-plugin/plugin.json claude-plugins/experiments/package.json && jq -r '.plugins[] | select(.name=="experiments") | .version' .claude-plugin/marketplace.json` — the three printed values MUST be identical to the target

## 8. Manual Verification

- [x] 8.1 Invoke `/experiments:commander-delete` with no args and an empty/missing registry; confirm "no projects registered" message and no file created
- [x] 8.2 Pre-seed two projects via `commander-add`, then invoke `/experiments:commander-delete <name>` for one of them; confirm confirmation prompt → success → only the other entry remains
- [x] 8.3 Invoke `/experiments:commander-delete <unknown-name>`; confirm abort with "project '<name>' is not registered" and file unchanged
- [x] 8.4 Invoke `/experiments:commander-delete` with no args on a populated registry; confirm picker appears with all projects + cancel option
- [x] 8.5 At the confirmation prompt, choose "Cancel"; confirm registry unchanged and neutral exit message
- [x] 8.6 Simulate mid-write interruption (kill between temp-write and rename) and confirm `projects.json` is intact and still contains the target record
- [x] 8.7 Inspect the resulting JSON after a successful delete: 2-space indent, trailing newline, `version` unchanged, remaining records intact byte-for-byte in their fields
