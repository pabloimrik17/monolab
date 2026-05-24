## MODIFIED Requirements

### Requirement: Project resolution from registry

The skill SHALL read the user-scoped Commander registry via the `commander-registry` reader contract documented in `claude-plugins/commander/commands/add.md` (path `<HOME>/.claude/commander/projects.json`, lazy-create-aware, version-gate on `version > 2`). The skill SHALL NOT mutate `projects.json` or its temp sibling.

If the registry is missing or `projects` is empty, the skill SHALL print `No projects registered. Use /commander:add to register one.` and exit zero without performing scan or apply.

If the registry is present but every record after applying `projectsFilter` is filtered out (e.g. a name in the filter that does not match any record), the skill SHALL print a one-line warning identifying the unmatched names and proceed with the remaining matched records (if any). If no record matches, the skill SHALL exit zero with a clear "no projects matched the filter" message.

For each record retained after filtering, the skill SHALL classify drift:

- **Missing path drift** — `Bash test -d "<record.path>"` exits non-zero. The skill SHALL skip the record, emit a `Skipped (path missing): <name> — <path>` warning to be included in the final summary, and continue with the remaining records.
- **Legacy v1 drift** — `record.repoType` is absent. The skill SHALL accept the record as-is (no action), since `repoType` is not consumed by scan or apply.

#### Scenario: Empty registry exits cleanly

- **WHEN** the registry file is missing
- **THEN** the skill prints `No projects registered. Use /commander:add to register one.` and exits zero with no scan, no apply, and no summary block

#### Scenario: Missing path skipped with warning

- **WHEN** a registered project's `path` does not exist on disk
- **THEN** the skill skips that project for both scan and apply, records `Skipped (path missing): <name> — <path>` in the summary, and continues with remaining projects

#### Scenario: Filter unmatched name surfaces warning

- **WHEN** `projectsFilter: ["investlab", "ghost"]` is passed but no registered project has `name == "ghost"`
- **THEN** the skill prints a one-line warning `Filter name not found: ghost` and proceeds with the matched records (here `investlab`)
