## 1. Delete Demo Plugin

- [ ] 1.1 Delete `claude-plugins/demo/` directory entirely

## 2. Update Marketplace

- [ ] 2.1 Remove demo entry from `.claude-plugin/marketplace.json`

## 3. Update Specs

- [ ] 3.1 Update `openspec/specs/claude-code-plugins/spec.md` to use expo-developer in examples instead of demo
- [ ] 3.2 Remove "Demo Plugin Hello World Command" requirement section

## 4. Verify

- [ ] 4.1 Run `pnpm install` to verify workspace still valid
- [ ] 4.2 Grep codebase for remaining "demo" references (exclude apps/demo, archived changes)
