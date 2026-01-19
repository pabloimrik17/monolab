## 1. Plugin Scaffolding

- [ ] 1.1 Create `claude-plugins/expo-developer/.claude-plugin/plugin.json` manifest
- [ ] 1.2 Create `claude-plugins/expo-developer/package.json` (private, workspace member)
- [ ] 1.3 Create `claude-plugins/expo-developer/README.md` with usage docs

## 2. Skill Implementation

- [ ] 2.1 Create `claude-plugins/expo-developer/skills/expo-dependency-check.md`
- [ ] 2.2 Define skill frontmatter (name, description)
- [ ] 2.3 Write Expo project detection logic (check for expo dependency, app.json)
- [ ] 2.4 Write package manager detection logic (lock file checks)
- [ ] 2.5 Write validation workflow (check vs fix options)
- [ ] 2.6 Add examples for each package manager

## 3. Marketplace Integration

- [ ] 3.1 Update `/.claude-plugin/marketplace.json` with expo-developer entry

## 4. Validation

- [ ] 4.1 Test plugin loads correctly with `claude --plugin-dir`
- [ ] 4.2 Test skill triggers on package.json modification
- [ ] 4.3 Test package manager detection for each supported manager
- [ ] 4.4 Run markdownlint on skill file
