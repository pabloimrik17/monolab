## 1. Delete Demo Plugin

- [x] 1.1 Delete `claude-plugins/demo/` directory entirely

## 2. Update Marketplace

- [x] 2.1 Remove demo entry from `.claude-plugin/marketplace.json`

## 3. Update Specs

- [x] 3.1 Update `openspec/specs/claude-code-plugins/spec.md` to use expo-developer in examples instead of demo
- [x] 3.2 Remove "Demo Plugin Hello World Command" requirement section

## 4. Verify

- [x] 4.1 Run `pnpm install` to verify workspace still valid
- [x] 4.2 Grep codebase for remaining "demo" references (exclude apps/demo, archived changes)
