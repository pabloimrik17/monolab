## Context

Monolab ships two Claude Code plugins (`experiments`, `expo-developer`) from the `claude-plugins/` directory and exposes them via a root `.claude-plugin/marketplace.json`. Versioning is currently manual: a session-time skill, `plugin-version-bump`, classifies the change, computes a semver level, and synchronizes the `version` string across `.claude-plugin/plugin.json`, `package.json`, and the marketplace entry. No git tags are produced for plugins; users adding the marketplace effectively pull HEAD of the repository's default branch.

Two upstream features in Claude Code have changed the landscape:

- **2.1.119** introduced `claude plugin tag`, which creates `{plugin-name}--v{version}` git tags after validating that `plugin.json` and the marketplace entry agree on the version.
- **2.1.110** introduced semver-range plugin dependencies (`{ "name": "...", "version": "~2.1.0" }`) that are resolved against those tags.

For the rest of the monorepo, npm package releases are already automated by `release-please` (config: `release-please-config.json`, manifest: `.release-please-manifest.json`, workflow: `.github/workflows/release-please.yml`, `target-branch: main`). That workflow has been effectively dormant because `main` is currently 145 commits behind `develop` and the team has not been merging to `main`. The user's stated intent is to resume weekly `develop → main` merges and use `main` as the release branch for both packages and plugins.

The repository's GitHub default branch is `develop`. Until that flips to `main`, marketplace consumers continue to read `develop` (commit-SHA versioning), even though tags will exist on `main`. The flip is acknowledged as a future decision, out of scope here.

## Goals / Non-Goals

**Goals:**

- Plugin releases are tagged `{plugin-name}--v{version}` automatically when a plugin's manifest version is bumped on `main`.
- A single source of truth (`release-please-config.json`) drives bump, file sync, and tag creation for both plugins.
- `plugin.json` and the corresponding `marketplace.json` entry stay in sync by construction (release-please bumps both atomically).
- The `expo-developer` plugin gains user-configurable defaults so its `expo-dependency-check` skill can run non-interactively when desired.
- The `plugin-version-bump` skill is retired; its responsibility is fully covered by release-please's `extra-files` mechanism.

**Non-Goals:**

- Migrating package npm releases to a different model.
- Reorganising the `develop`/`main` branch strategy (separate decision).
- Flipping the GitHub default branch to `main` (separate decision).
- Adding userConfig beyond the two keys justified by today's expo-dependency-check skill.
- Cross-plugin dependencies (`dependencies[]` in `plugin.json`) — possible future work, not part of this change.

## Decisions

### D1: Reuse the existing `release-please.yml` workflow rather than adding a parallel one

The existing workflow is configured with `target-branch: main` and uses `googleapis/release-please-action@v4` with `manifest-file` and `config-file`. It already auto-detects new entries in those JSON files when a push to `main` occurs.

**Alternatives considered:**

- *Separate workflow `release-please-plugins.yml` triggered on `develop`*. Cleaner conceptual separation, but creates two release pipelines drifting independently and contradicts the user's decision to use `main` as the single release branch.
- *Wrap `claude plugin tag` in a custom action*. Would add validation parity but loses release-please's PR-based review, conventional-commit-driven bumping, and CHANGELOG generation.

**Rationale:** Reuse maximises consistency with packages, minimises new infrastructure, and keeps the team's mental model singular ("releases happen on main").

### D2: Per-plugin `release-type: simple` with `tag-separator: "--"` overriding the default

`release-type: node` expects `package.json` and bumps it; for plugins the canonical version lives in `.claude-plugin/plugin.json`, not `package.json`. `release-type: simple` makes no assumption about the file layout and lets us point `extra-files` at the correct paths.

`tag-separator` defaults to `-` (used by package tags such as `react-clean-v3.1.4`). Overriding it per-plugin to `--` produces `experiments--v0.7.0` as required by `claude plugin tag` and the dependency resolver.

**Alternatives considered:**

- *Custom `release-type` plugin*. Overkill for two plugin entries.
- *Use `node` and lie about `package.json`*. Brittle and confusing.

### D3: `extra-files` for `marketplace.json` uses array indices, not jsonpath filter expressions

The release-please documentation explicitly demonstrates basic dot notation (`$.json.path.to.field`) for `type: "json"` `extra-files`. Filter expressions of the form `$.plugins[?(@.name=='X')].version` are not documented as supported. Using array indices (`$.plugins[0].version`, `$.plugins[1].version`) is guaranteed to work with the documented syntax.

**Trade-off:** The release-please config becomes coupled to the order of `plugins[]` in `marketplace.json`. Reordering will silently bump the wrong plugin.

**Mitigation:** Validate via `release-please --dry-run` during task 4 before merging. Document the order constraint in the root README and in inline guidance near the `plugins[]` array. Consider switching to filter expressions in a follow-up change once empirically verified.

### D4: `userConfig` for `expo-developer` is limited to two keys

`default_action` (`ask` / `check` / `fix`) lets advanced users skip the per-invocation prompt. `package_manager_override` provides an escape hatch when the lockfile-based detection is wrong (e.g., monorepos with multiple lockfiles).

**Alternatives considered:**

- *No userConfig*. Status quo; loses opportunity to demonstrate the 2.1.82 feature on a real plugin.
- *Add EAS-related keys (project ID, default profile)*. Premature — no skill in this plugin uses them yet.

**Rationale:** Both keys map directly to choices the existing skill already exposes. They earn their keep on day one.

### D5: Removal of the `plugin-version-bump` skill is intentional and complete

The skill's remaining purpose after release-please adoption would be redundant with `extra-files`. Keeping it as a manual fallback creates two divergent sources of truth (release-please bumps via PR vs. skill bumps in-session). The skill is removed entirely; the spec capability is retired.

**Alternatives considered:**

- *Keep skill as opt-in manual fallback*. Reintroduces the drift problem this change aims to solve.

## Risks / Trade-offs

- **`extra-files` jsonpath array index couples to array order in `marketplace.json`** → Mitigated by `--dry-run` validation in task 4 + documented constraint. Future revisit: filter expressions if support is verified.
- **Until the GitHub default branch flips, users adding `pabloimrik17/monolab` continue reading `develop` and never see released tags by default** → Documented in proposal Impact section. Users wanting tagged versions can pin via `@ref`. Not a blocker; matches the user's transitional plan.
- **First release-please run after this change requires `develop → main` to be merged so `main` carries the plugin trees and `marketplace.json`** → Captured as task 0 (pre-requisite, outside the change PR).
- **Loss of in-session bump guidance** when contributors edit a plugin → Mitigated by conventional-commit conventions already in place (`feat(experiments)`, `fix(expo-developer)`) which release-please consumes; documented in plugin READMEs.
- **`release-type: simple` does not validate that the `version` strings in `plugin.json` and `marketplace.json` match before tagging** → `extra-files` makes drift impossible by construction (release-please bumps both in the same PR). Drift would only arise from manual edits between releases; validated by `claude plugin validate` in CI if added later.
- **Existing `experiments` plugin has its own `package.json`** with a `version` field (currently `0.7.0`). Not bumping `package.json` would create internal drift. Add it as a third `extra-files` entry for `experiments` → handled in task 1.

## Migration Plan

1. Out of PR: merge `develop → main` so `main` carries `marketplace.json` and the `claude-plugins/` tree (task 0).
2. Land this change on `develop` first, then merge to `main` as part of the next weekly release cycle.
3. First push to `main` after the change opens a release-please PR (no version bump yet, just registers the manifest entries).
4. Optionally tag baseline manually post-merge: `cd claude-plugins/experiments && claude plugin tag --push` then same for `expo-developer`. release-please respects pre-existing tags when their version matches the manifest.
5. Subsequent feature commits trigger release-please PRs that bump versions, sync `marketplace.json`, and create tags on merge.

**Rollback:** Revert the change PR; release-please reverts to packages-only behaviour. The `plugin-version-bump` skill can be restored from git history if needed.

## Open Questions

- **Q1**: Does release-please v4's jsonpath implementation accept filter expressions like `$.plugins[?(@.name=='X')].version`? → Empirically test in task 4. If yes, swap from array indices in a follow-up.
- **Q2**: Should `claude plugin validate` run in CI to catch manual drift between releases? → Out of scope here; consider as a separate hardening change.
- **Q3**: When the GitHub default branch flips to `main`, do we publish a deprecation notice for users still pointing at `develop`? → Out of scope; tracked separately.
