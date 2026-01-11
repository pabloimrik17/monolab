# claude-code-plugins Specification

## Purpose
TBD - created by archiving change add-claude-code-marketplace. Update Purpose after archive.
## Requirements
### Requirement: Plugins Directory Structure

The monorepo SHALL have a `claude-plugins/` directory at the root level for hosting Claude Code plugins.

Each plugin directory SHALL follow the Claude Code plugin structure:
- `.claude-plugin/plugin.json` manifest file (required)
- `commands/` directory for slash commands (optional)
- `skills/` directory for agent skills (optional)
- `agents/` directory for subagents (optional)
- `hooks/` directory for event handlers (optional)

#### Scenario: Plugin directory exists

- **GIVEN** the monolab repository
- **WHEN** a developer navigates to the root
- **THEN** a `claude-plugins/` directory SHALL exist at the same level as `packages/` and `apps/`

#### Scenario: Plugin follows structure conventions

- **GIVEN** a plugin named `demo` in `claude-plugins/demo/`
- **WHEN** examining its structure
- **THEN** it SHALL have `.claude-plugin/plugin.json` at minimum
- **AND** any component directories (commands/, skills/, etc.) SHALL be at the plugin root, NOT inside `.claude-plugin/`

---

### Requirement: Marketplace Registration

The repository SHALL be registered as a Claude Code marketplace via a root-level `.claude-plugin/marketplace.json` file.

The marketplace manifest SHALL include:
- `name`: Marketplace identifier (string)
- `owner`: Object with `name` and optional `email`
- `metadata`: Object with `description`, `version`, and `pluginRoot`
- `plugins`: Array of plugin entries with `name`, `source`, `version`, and `description`

#### Scenario: Marketplace manifest exists

- **GIVEN** the monolab repository
- **WHEN** checking the root directory
- **THEN** `.claude-plugin/marketplace.json` SHALL exist

#### Scenario: Users can add marketplace

- **GIVEN** a user with Claude Code installed
- **WHEN** they run `/plugin marketplace add m0n0t3ch/monolab`
- **THEN** the monolab marketplace SHALL be registered in their Claude Code configuration
- **AND** plugins from monolab SHALL appear in the Discover tab

#### Scenario: Plugin installation from marketplace

- **GIVEN** a user has added the monolab marketplace
- **WHEN** they run `/plugin install demo@monolab`
- **THEN** the demo plugin SHALL be installed
- **AND** its commands SHALL be available as `/demo:command-name`

---

### Requirement: Plugin Package Integration

Each plugin SHALL have a `package.json` for workspace tooling integration.

The package.json SHALL:
- Use naming convention `@m0n0lab/plugin-{name}`
- Set `"private": true` (plugins are not npm-published)
- Be included in pnpm workspace for linting and formatting

#### Scenario: Plugin included in workspace

- **GIVEN** a plugin with `package.json` at `claude-plugins/demo/package.json`
- **WHEN** running `pnpm install` from root
- **THEN** the plugin SHALL be recognized as a workspace member

#### Scenario: Plugin linting works

- **GIVEN** a plugin with markdown files in `commands/`
- **WHEN** running markdownlint on the repository
- **THEN** plugin command files SHALL be linted according to project standards

---

### Requirement: Demo Plugin Hello World Command

The `demo` plugin SHALL provide a `/demo:hello-world` slash command.

When invoked, the command SHALL:
- Output "Hello World" in one of exactly 25 different languages
- Select the language randomly (non-deterministic)
- Output only the greeting, with no additional text

#### Scenario: Hello world command invocation

- **GIVEN** the demo plugin is installed
- **WHEN** a user types `/demo:hello-world`
- **THEN** Claude SHALL respond with "Hello World" in a randomly selected language
- **AND** the response SHALL contain only the greeting phrase

#### Scenario: Language variety

- **GIVEN** the hello-world command
- **WHEN** examining the command definition
- **THEN** it SHALL include exactly 25 language options including:
  - English: "Hello World"
  - Spanish: "Hola Mundo"
  - French: "Bonjour le Monde"
  - German: "Hallo Welt"
  - Italian: "Ciao Mondo"
  - Portuguese: "Olá Mundo"
  - Japanese: "こんにちは世界"
  - Chinese (Simplified): "你好世界"
  - Korean: "안녕하세요 세계"
  - Russian: "Привет мир"
  - Arabic: "مرحبا بالعالم"
  - Hindi: "नमस्ते दुनिया"
  - Dutch: "Hallo Wereld"
  - Swedish: "Hej Världen"
  - Norwegian: "Hei Verden"
  - Danish: "Hej Verden"
  - Finnish: "Hei Maailma"
  - Polish: "Witaj Świecie"
  - Czech: "Ahoj Světe"
  - Greek: "Γειά σου Κόσμε"
  - Turkish: "Merhaba Dünya"
  - Hebrew: "שלום עולם"
  - Thai: "สวัสดีโลก"
  - Vietnamese: "Xin chào Thế giới"
  - Indonesian: "Halo Dunia"

---

### Requirement: Workspace Configuration Updates

The pnpm workspace configuration SHALL include the `claude-plugins/*` pattern.

#### Scenario: Workspace includes plugins

- **GIVEN** `pnpm-workspace.yaml` at repository root
- **WHEN** examining its `packages` array
- **THEN** `claude-plugins/*` SHALL be included as a workspace pattern

#### Scenario: TypeScript configuration

- **GIVEN** plugins may contain TypeScript files in the future
- **WHEN** TypeScript configuration is needed
- **THEN** plugin tsconfig files SHALL extend the base configuration from `@m0n0lab/ts-configs`

