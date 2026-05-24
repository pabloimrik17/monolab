## Context

The `experiments` plugin is documented as a "Beta skills and commands staging area" with explicit graduation language ("features here may graduate to production plugins once stable"). Commander has accumulated:

- 6 slash commands (`commander-{add,list,update,delete,update-patch,update-deep-patch}`)
- 2 skills (`commander-normalize`, `commander-update-orchestrator`)
- 6 dedicated OpenSpec capabilities (`commander-registry`, `commander-normalize-skill`, `commander-update-command`, `commander-update-patch-command`, `commander-update-deep-patch-command`, `commander-update-orchestrator-skill`)
- A filesystem contract at `<HOME>/.claude/commander/projects.json` shared across all commander commands.

Two existing plugins establish the structural pattern this change conforms to: `experiments` (with workspace integration + commands + skills) and `expo-developer` (with `userConfig`-driven skill behavior). The release pipeline is already templated in `release-please-config.json` for the two existing plugin packages; the `claude-plugin-release` capability codifies the contract.

Constraints carried in from the workspace:
- `pnpm-workspace.yaml` already globs `claude-plugins/*` → new plugin is auto-recognized.
- `release-please-config.json` requires explicit per-package entries (no globbing).
- The 40-character commit digest pinning policy applies to any new workflow steps.
- The order of entries in `.claude-plugin/marketplace.json` `plugins[]` is significant for jsonpath resolution (`claude-plugin-release` spec scenario).

## Goals / Non-Goals

**Goals:**

- Give commander a first-class plugin identity with independent versioning and release lifecycle.
- Move only what belongs to commander's CRUD identity; leave orchestration (`update-patch`, `update-deep-patch`) in experiments alongside its npm-update tooling.
- Preserve the filesystem registry contract byte-for-byte — no migration of `<HOME>/.claude/commander/projects.json`.
- Cut over slash-command namespaces cleanly: `/experiments:commander-{add,list,update,delete}` → `/commander:{add,list,update,delete}` with no aliases.
- Re-home OpenSpec capabilities so each spec lives where its owning artifact lives.

**Non-Goals:**

- No behavior changes to any moved command or skill. This is pure relocation + renaming.
- No backwards-compatible aliases for the old slash-command names.
- No migration of registry data (filesystem location unchanged).
- No move of `commander-update-{patch,deep-patch}` or `commander-update-orchestrator` — they stay in `experiments` because their dependencies (`scan-npm-updates`, `group-packages-for-research`, `parallel-research-workflow`) are non-commander concerns shared with `npm-update-{patch,deep-patch}`.
- No new commander features (e.g., no new fields, no new flags).
- No change to `release-please.yml` workflow itself — only its config and manifest grow new package entries.

## Decisions

### D1. Scope split: CRUD-only graduation (option A from explore)

Move the four CRUD commands + `commander-normalize` skill. The orchestration commands stay in `experiments` because they depend on `commander-update-orchestrator` which depends on `scan-npm-updates`, `group-packages-for-research`, and `parallel-research-workflow` — three non-commander skills that are also used by `npm-update-patch` and `npm-update-deep-patch`. Moving them to `commander` would force a cross-plugin skill dependency (Claude Code plugins have no formal mechanism for that) or duplication.

**Alternative considered**: move everything `commander-*` to the new plugin and either (a) duplicate the non-commander skills or (b) move the non-commander skills too. Rejected: (a) creates skill divergence risk; (b) drags `npm-update-*` siblings out of their home in experiments.

### D2. Slash-command naming: drop the redundant `commander-` prefix

Inside a plugin called `commander`, commands like `/commander:commander-add` carry stuttering. Rename to `/commander:{add,list,update,delete}`. The file basenames inside `commands/` follow the slash: `add.md`, `list.md`, `update.md`, `delete.md`.

**Alternative considered**: keep `/commander:commander-add` to minimize muscle-memory disruption. Rejected: the user (sole operator) accepted the clean cut, and "now or never" applies — adding aliases later doubles the surface area.

### D3. Cross-plugin coupling lives at filesystem, not slash-command runtime

The orchestration commands in experiments (`commander-update-patch`, `commander-update-deep-patch`) and the orchestrator skill consume the registry by reading `<HOME>/.claude/commander/projects.json` directly — they never invoke `/commander:list` at runtime. The "coupling" between the two plugins is documentary (READMEs and prose reference each other) and behavioral (the orchestrator skill calls scan subagents on registry-listed paths), never runtime-IPC.

Consequence: removing the commander plugin would break the orchestration commands (no registry to read), but the new commander plugin can be developed, versioned, and released entirely independently of experiments. There is no API surface to coordinate.

### D4. Initial version 0.1.0; first feat lands at 1.0.0

Set `version: "0.1.0"` in `claude-plugins/commander/.claude-plugin/plugin.json`, `package.json`, and the new entry in root `.claude-plugin/marketplace.json`. Seed `.release-please-manifest.json` with `"claude-plugins/commander": "0.1.0"`. The conventional-commit `feat(commander): create commander plugin` (or the merge of this change) triggers release-please's first PR, which bumps to `0.2.0` per conventional-commit semver-for-zero rules.

**Note**: We tag this as `feat(commander)!:` to force a major bump → `1.0.0`. That matches the user's stated intent ("first bump goes to 1.0"). The `!` is justified: this introduces a brand-new public plugin namespace + breaks `/experiments:commander-*` slash commands.

### D5. OpenSpec capability re-homing — extraction, not in-place rename

The `experiments-plugin` capability today contains command-file + behavior + version-bump requirements for `commander-add`, `commander-list`, `commander-delete`, and `commander-update`. We extract these into four dedicated capabilities owned by the new commander plugin:

- New: `commander-add-command`, `commander-list-command`, `commander-delete-command`.
- Modified: `commander-update-command` (already exists as a dedicated spec — only its slash-command name and file path change).

The remaining experiments-plugin requirements (commander-update-patch, commander-update-deep-patch, commander-update-orchestrator) stay in `experiments-plugin` since those artifacts stay in the experiments plugin.

**Alternative considered**: put add/list/delete behavior under a single mega `commander-plugin` capability. Rejected: that breaks the per-command-per-spec pattern already in use (`commander-update-command`, `commander-update-patch-command`, etc.) and produces a hard-to-navigate spec file.

### D6. README strategy — pointer, not duplication

`experiments/README.md` drops its CRUD sections (Commands → `commander-add`, `commander-list`, `commander-update`, `commander-delete`; Skills → `commander-normalize`) and inserts a single pointer paragraph linking to `claude-plugins/commander/README.md`. The new `commander/README.md` is authored fresh — content lifted from the dropped sections plus a "Releases" subsection mirroring the one in `experiments/README.md` (adjusted tag prefix).

### D7. release-please config additions mirror existing entries verbatim

The new `packages["claude-plugins/commander"]` entry in `release-please-config.json` mirrors the experiments/expo-developer entries field-for-field:

```json
"claude-plugins/commander": {
    "release-type": "simple",
    "package-name": "commander",
    "tag-separator": "--",
    "include-v-in-tag": true,
    "changelog-path": "CHANGELOG.md",
    "extra-files": [
        { "type": "json", "path": ".claude-plugin/plugin.json", "jsonpath": "$.version" },
        { "type": "json", "path": "package.json", "jsonpath": "$.version" },
        { "type": "json", "path": "/.claude-plugin/marketplace.json", "jsonpath": "$.plugins[?(@.name=='commander')].version" }
    ]
}
```

Manifest seed: `"claude-plugins/commander": "0.1.0"`.

### D8. Marketplace.json entry placement

Insert the `commander` entry in `.claude-plugin/marketplace.json` `plugins[]` **between** the existing entries — order matters for jsonpath but the specific position is only constrained to be stable (so jsonpath `?(@.name=='commander')` resolves). Place it alphabetically by name (`commander`, `experiments`, `expo-developer`) for human navigability. The `claude-plugin-release` spec's "marketplace.json array order is documented" scenario remains satisfied.

### D9. Conventional-commit scope = `commander`

`commitlint.config.ts` uses `@commitlint/config-conventional` with no `scope-enum` restriction → no change needed to allow `commander` as a scope. Conventional commits going forward use `feat(commander):`, `fix(commander):`, etc. The merge commit for this change uses `feat(commander)!:` (see D4).

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| User's shell aliases or scripts invoke `/experiments:commander-{add,list,update,delete}` and break silently. | Confirmed in explore: user is sole operator and accepts the clean cut. No mitigation needed. Flag in tasks.md to remind user to update their aliases. |
| Orchestration commands in experiments reference the old slash names in their prose (READMEs, command-file bodies, orchestrator skill instructions). | tasks.md has an explicit ref-rename sweep across `claude-plugins/experiments/commands/commander-update-{patch,deep-patch}.md`, `claude-plugins/experiments/skills/commander-update-orchestrator/`, `claude-plugins/experiments/README.md`, and the affected spec files. |
| `release-please.yml` workflow does not pick up the new package entry on its first run. | Manifest is explicitly seeded with `0.1.0`. The release-please PR that lands the commit will include `claude-plugins/commander` in its release candidates as soon as a `feat(commander)` commit exists since `0.1.0` — which is this change's own merge commit. |
| `jsonpath` for marketplace.json fails because the entry is placed in an unexpected position. | jsonpath uses `?(@.name=='commander')` which is order-independent. Verified by inspecting existing entries — they use the same pattern. |
| OpenSpec `validate --strict` rejects the extraction of requirements from `experiments-plugin` because the delta removes too much. | Use OpenSpec's standard "remove + add" delta semantics: each removed requirement in `experiments-plugin` corresponds to a new requirement in the new commander-* capability. Validate after writing. |
| Filesystem registry at `<HOME>/.claude/commander/projects.json` has records pointing to absolute paths that the user does not want disclosed in CHANGELOG/README. | Non-issue: registry contents are user-local, never committed; this change does not touch registry data. |
| The orchestration commands' update-patch / deep-patch logic embeds the string `/experiments:commander-list` (or similar) in user-visible messages. | tasks.md sweep covers user-visible strings. After the cut, those messages will reference `/commander:list`. |

## Migration Plan

This is a single-PR migration with no staged rollout — the user is sole operator.

1. **Pre-cut**: branch `feature/create-commander-plugin` (already created).
2. **Scaffold** `claude-plugins/commander/` with `.claude-plugin/plugin.json` (`version: "0.1.0"`), `package.json` (`private: true`, name `@m0n0lab/plugin-commander`, version `0.1.0`), empty `commands/`, empty `skills/`, blank `CHANGELOG.md`, fresh `README.md`.
3. **Git-move** the four CRUD command files and the `commander-normalize` skill folder using `git mv` so history follows the path change.
4. **Rename** the four command files (`commander-add.md` → `add.md`, etc.) — also via `git mv`.
5. **Edit** moved files to update internal slash-command references and any self-references.
6. **Edit** the three remaining experiments commander artifacts (`commander-update-patch.md`, `commander-update-deep-patch.md`, `skills/commander-update-orchestrator/`) to update slash-command references from `/experiments:commander-{add,list,update,delete}` → `/commander:{add,list,update,delete}`.
7. **Edit** `experiments/README.md` (drop CRUD sections, add commander-plugin pointer).
8. **Author** `commander/README.md`.
9. **Register** `commander` in root `.claude-plugin/marketplace.json` (alphabetically first).
10. **Add** entries to `release-please-config.json` and `.release-please-manifest.json`.
11. **Spec deltas**: `openspec/changes/create-commander-plugin/specs/` — new specs for `commander-plugin`, `commander-add-command`, `commander-list-command`, `commander-delete-command`; modify specs for `commander-registry`, `commander-normalize-skill`, `commander-update-command`, `commander-update-patch-command`, `commander-update-deep-patch-command`, `commander-update-orchestrator-skill`, `experiments-plugin`, `claude-plugin-release`.
12. **Validate**: `openspec validate create-commander-plugin --strict`.
13. **Commit**: single `feat(commander)!: graduate commander to its own plugin` commit (or a small series with the breaking change footer on the final one).
14. **PR + merge**: release-please opens a release PR bumping `commander` from `0.1.0` to `1.0.0` (breaking change). Merging it tags `commander--v1.0.0` and publishes the marketplace entry.

**Rollback**: revert the merge commit. The registry at `<HOME>/.claude/commander/projects.json` is unaffected by the rollback (it's user-local filesystem state, not part of the repo).

## Open Questions

- ~~Initial version: `0.1.0` or `1.0.0`?~~ Resolved (D4) — `0.1.0`, first bump to `1.0.0` via `feat(commander)!:` footer.
- ~~Should `commander-update-orchestrator` skill move to commander?~~ Resolved (D1) — stays in experiments.
- Marketplace.json position for the new entry — alphabetical (commander, experiments, expo-developer) or insertion-order? D8 picks alphabetical for navigability; trivial to revisit.
- `nx.json` / `knip.config.ts` may need new entries. Pending verification during tasks.md execution — flagged but not blocking the proposal.
- The local `claude-plugins/experiments/.claude-plugin/marketplace.json` file exists (with only `version: "0.7.0"`) while `expo-developer` has no equivalent. Treat as legacy/unused and do NOT replicate in `commander`.
