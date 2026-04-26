## 1. release-please configuration

- [x] 1.1 Add `claude-plugins/experiments` entry to `release-please-config.json` with `release-type: simple`, `tag-separator: "--"`, `include-v-in-tag: true`
- [x] 1.2 Configure `extra-files` for the experiments entry: `.claude-plugin/plugin.json` (`type: json`, `jsonpath: $.version`), root `.claude-plugin/marketplace.json` (`type: json`, `jsonpath` targeting the experiments entry's version using array index), and `package.json` (`type: json`, `jsonpath: $.version`)
- [x] 1.3 Add `claude-plugins/expo-developer` entry to `release-please-config.json` with the same release-type, tag-separator, and include-v-in-tag settings
- [x] 1.4 Configure `extra-files` for the expo-developer entry: `.claude-plugin/plugin.json` (`jsonpath: $.version`), `package.json` (`jsonpath: $.version`), and root `.claude-plugin/marketplace.json` (matching plugin entry version) so all version surfaces stay in sync
- [x] 1.5 Seed `.release-please-manifest.json` with `"claude-plugins/experiments": "<current version from plugin.json>"` and `"claude-plugins/expo-developer": "<current version from plugin.json>"`
- [x] 1.6 Document the array-index coupling in the root README (or a new `RELEASE.md`): reordering `plugins[]` in `marketplace.json` requires updating the corresponding jsonpath indices

## 2. expo-developer userConfig

- [x] 2.1 Add `userConfig` block to `claude-plugins/expo-developer/.claude-plugin/plugin.json` with `default_action` (string, default `"ask"`) and `package_manager_override` (string, default `""`)
- [x] 2.2 Update `claude-plugins/expo-developer/skills/expo-dependency-check/SKILL.md` to read `${user_config.default_action}` and branch the workflow accordingly (preserve `ask` as the default behavior)
- [x] 2.3 Update the same SKILL.md to consume `${user_config.package_manager_override}` and override lockfile-based detection when non-empty
- [x] 2.4 Bump `claude-plugins/expo-developer/.claude-plugin/plugin.json` `version` to next minor (`0.2.0`), updating the matching `marketplace.json` entry to keep them in sync (since release-please does not yet manage this plugin in the previous tasks merge order)

## 3. Retire plugin-version-bump skill

- [x] 3.1 Delete `claude-plugins/experiments/skills/plugin-version-bump/` directory
- [x] 3.2 Bump `claude-plugins/experiments/.claude-plugin/plugin.json` `version` to next minor (`0.8.0`) and update the matching `marketplace.json` entry; mention in CHANGELOG that the skill is removed (BREAKING for skill consumers)
- [x] 3.3 Verify no other plugin references or workflows depend on the skill (`grep -r "plugin-version-bump" .`)

## 4. Documentation

- [x] 4.1 Add or update `claude-plugins/experiments/README.md`: tag format, how a release is triggered, link to root release docs
- [x] 4.2 Add or update `claude-plugins/expo-developer/README.md`: same content + a section on `userConfig` keys and what they control
- [x] 4.3 Add a `Plugin Releases` section (or new `RELEASE.md`) at the repo root covering: `{plugin-name}--v{version}` convention, conventional-commit-to-bump mapping, weekly `develop → main → release` cadence, and the current `develop`-as-default-branch caveat
- [x] 4.4 Cross-link the new release documentation from the existing OpenSpec `package-release` capability description (no spec change required, just a pointer)

## 5. Spec retirement (handled at archive time, not implementation)

- [x] 5.1 Confirm that archiving this change will remove `openspec/specs/plugin-version-bump/` entirely (REMOVED capability — no remaining requirements after delta is applied)
- [x] 5.2 Confirm that archiving this change will create `openspec/specs/claude-plugin-release/` and `openspec/specs/expo-developer-plugin/` from the change's spec files
