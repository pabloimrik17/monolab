## Context

The `demo` plugin at `claude-plugins/demo/` was created as a tutorial/example when setting up the marketplace. Now that `expo-developer` exists as a real plugin, the demo serves no purpose and clutters the codebase.

Files to remove:
- `claude-plugins/demo/` (entire directory)
- Entry in `.claude-plugin/marketplace.json`

Files to update:
- `openspec/specs/claude-code-plugins/spec.md` (uses demo in examples)

## Goals / Non-Goals

**Goals:**
- Remove all traces of demo plugin from codebase
- Update spec examples to use expo-developer instead
- Keep marketplace functional with remaining plugins

**Non-Goals:**
- Removing `apps/demo` (SolidJS app - unrelated)
- Adding replacement functionality
- Modifying expo-developer plugin

## Decisions

1. **Delete directory vs archive**: Delete entirely. Demo has no historical value worth preserving.

2. **Spec example replacement**: Use `expo-developer` as the example plugin since it's a real, maintained plugin in the same marketplace.

3. **Removal order**: Delete files first, then update references. This prevents dangling references during the change.

## Risks / Trade-offs

- **Risk**: Someone relies on demo for testing → Mitigation: They can use expo-developer or create their own test plugin
- **Risk**: Spec examples become stale if expo-developer changes → Mitigation: expo-developer is stable and maintained in this repo
