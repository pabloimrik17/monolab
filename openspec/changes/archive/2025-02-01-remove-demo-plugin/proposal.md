## Why

The `demo` plugin in `claude-plugins/demo/` is a sample/tutorial plugin with no production value. It only provides a `/demo:hello-world` command that prints greetings in random languages. Removing it reduces maintenance overhead and keeps the plugins directory focused on real functionality.

## What Changes

- **BREAKING**: Remove `/demo:hello-world` slash command
- Delete entire `claude-plugins/demo/` directory (package.json, README.md, commands/, .claude-plugin/)
- Remove demo entry from `.claude-plugin/marketplace.json`
- Update `openspec/specs/claude-code-plugins/spec.md` examples to use `expo-developer` instead of `demo`

## Capabilities

### New Capabilities

None - this is a removal-only change.

### Modified Capabilities

- `claude-code-plugins`: Update examples to use `expo-developer` instead of `demo`

## Impact

- **Code**: `claude-plugins/demo/` directory deleted
- **Config**: `.claude-plugin/marketplace.json` demo entry removed
- **Specs**: `openspec/specs/claude-code-plugins/spec.md` examples updated
- **Users**: Anyone using `/demo:hello-world` will lose access (unlikely in production)
- **Dependencies**: None - the plugin is private and not published
- **CI/Workspace**: No nx project references to update (plugin not registered in nx)
