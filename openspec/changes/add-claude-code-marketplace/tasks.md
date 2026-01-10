## 1. Directory Structure Setup

- [x] 1.1 Create `claude-plugins/` directory at repository root
- [x] 1.2 Create `claude-plugins/demo/` directory for demo plugin
- [x] 1.3 Create `claude-plugins/demo/.claude-plugin/` directory for plugin manifest
- [x] 1.4 Create `claude-plugins/demo/commands/` directory for slash commands

## 2. Marketplace Configuration

- [x] 2.1 Create `.claude-plugin/` directory at repository root
- [x] 2.2 Create `.claude-plugin/marketplace.json` with marketplace metadata:
  - name: "monolab"
  - owner info
  - metadata with pluginRoot: "./claude-plugins"
  - plugins array with demo entry

## 3. Demo Plugin Implementation

- [x] 3.1 Create `claude-plugins/demo/.claude-plugin/plugin.json` with:
  - name: "demo"
  - version: "1.0.0"
  - description
  - author info

- [x] 3.2 Create `claude-plugins/demo/commands/hello-world.md` with:
  - YAML frontmatter with description
  - List of 25 language greetings
  - Instructions for random selection

- [x] 3.3 Create `claude-plugins/demo/package.json` (optional, for workspace integration):
  - name: "@m0n0lab/plugin-demo"
  - private: true

## 4. Workspace Configuration

- [x] 4.1 Update `pnpm-workspace.yaml` to add `claude-plugins/*` pattern
- [x] 4.2 Run `pnpm install` to register new workspace member
- [x] 4.3 Verify plugin appears in workspace with `pnpm ls --depth 0`

## 5. Documentation

- [x] 5.1 Add README.md to `claude-plugins/` directory explaining plugin development
- [x] 5.2 Add README.md to `claude-plugins/demo/` with usage instructions

## 6. Validation

- [ ] 6.1 Test plugin locally with `claude --plugin-dir ./claude-plugins/demo`
- [ ] 6.2 Verify `/demo:hello-world` command works
- [ ] 6.3 Verify random language selection (run multiple times)
- [x] 6.4 Run markdownlint on plugin files
- [x] 6.5 Verify marketplace.json is valid JSON

## 7. Git Configuration

- [x] 7.1 Update `.gitignore` if needed for plugin artifacts (N/A - no artifacts to ignore)
- [ ] 7.2 Commit all new files with appropriate commit message

## 8. Cleanup

- [x] 8.1 Delete `research/` directory (N/A - directory did not exist)

## Dependencies

- Tasks 1.x must complete before 3.x (directory structure needed for files)
- Tasks 2.x and 3.x can run in parallel
- Tasks 4.x depend on 3.3 (package.json needed for workspace)
- Tasks 6.x depend on all previous tasks
