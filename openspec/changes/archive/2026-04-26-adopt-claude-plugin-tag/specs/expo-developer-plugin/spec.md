## ADDED Requirements

### Requirement: Expo-Developer Plugin Structure

The `expo-developer` plugin SHALL exist at `claude-plugins/expo-developer/` and follow standard Claude Code plugin structure.

The plugin directory SHALL contain:

- `.claude-plugin/plugin.json` manifest
- `skills/` directory with at least one skill
- `package.json` with `"private": true`
- `README.md` documenting the plugin

#### Scenario: Plugin directory exists

- **WHEN** navigating to `claude-plugins/expo-developer/`
- **THEN** the directory SHALL exist with `.claude-plugin/plugin.json` manifest

#### Scenario: Plugin manifest valid

- **WHEN** examining `.claude-plugin/plugin.json`
- **THEN** it SHALL include `name: "expo-developer"`, `version`, `description`, and `keywords`

#### Scenario: Skills directory exists

- **WHEN** examining the plugin structure
- **THEN** `skills/expo-dependency-check/SKILL.md` SHALL exist

---

### Requirement: User Configuration

The plugin manifest SHALL declare a `userConfig` block with two keys: `default_action` and `package_manager_override`.

`default_action` SHALL have:

- `type: "string"`
- A `title` and `description`
- `default: "ask"`
- The accepted values, documented in `description`, are `ask`, `check`, and `fix`

`package_manager_override` SHALL have:

- `type: "string"`
- A `title` and `description`
- `default: ""`
- The accepted non-empty values, documented in `description`, are `npm`, `pnpm`, `yarn`, and `bun`

#### Scenario: userConfig present in plugin.json

- **WHEN** examining `claude-plugins/expo-developer/.claude-plugin/plugin.json`
- **THEN** the file SHALL contain a top-level `userConfig` object
- **AND** that object SHALL contain `default_action` and `package_manager_override` keys with the schemas described above

#### Scenario: defaults preserve current behavior

- **WHEN** a user enables the plugin without providing custom values
- **THEN** `default_action` SHALL be `"ask"` (skill prompts the user as it does today)
- **AND** `package_manager_override` SHALL be `""` (skill detects package manager from lockfiles as it does today)

---

### Requirement: Expo-Dependency-Check Skill Honors User Configuration

The `expo-dependency-check` skill SHALL consume `${user_config.default_action}` to decide whether to prompt the user or run a fixed action, and SHALL consume `${user_config.package_manager_override}` to override lockfile-based detection when set.

When `default_action` is `ask`, the skill SHALL behave as before, prompting the user to choose between `Check`, `Auto-fix`, or `Skip`.

When `default_action` is `check`, the skill SHALL run `<prefix> expo install --check` directly without prompting.

When `default_action` is `fix`, the skill SHALL run `<prefix> expo install --fix` directly without prompting.

When `package_manager_override` is non-empty, the skill SHALL use the override value as the `<prefix>` source instead of detecting from lockfiles.

#### Scenario: default_action ask preserves prompt

- **WHEN** the skill activates with `${user_config.default_action} = "ask"`
- **THEN** the skill SHALL ask the user to choose Check / Auto-fix / Skip

#### Scenario: default_action check runs without prompt

- **WHEN** the skill activates with `${user_config.default_action} = "check"`
- **THEN** the skill SHALL execute `<prefix> expo install --check` directly
- **AND** the skill SHALL NOT prompt the user

#### Scenario: default_action fix runs without prompt

- **WHEN** the skill activates with `${user_config.default_action} = "fix"`
- **THEN** the skill SHALL execute `<prefix> expo install --fix` directly
- **AND** the skill SHALL NOT prompt the user

#### Scenario: package_manager_override forces prefix

- **WHEN** `${user_config.package_manager_override} = "pnpm"` and the project contains a `bun.lockb`
- **THEN** the skill SHALL use `pnpx` (or the documented pnpm-equivalent prefix) instead of `bunx`

#### Scenario: empty package_manager_override falls back to detection

- **WHEN** `${user_config.package_manager_override} = ""` and the project contains a `pnpm-lock.yaml`
- **THEN** the skill SHALL detect pnpm from the lockfile and use `pnpx`
