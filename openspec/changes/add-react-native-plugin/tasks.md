# Tasks: Add React Native Plugin

## Implementation Tasks

### 1. Create plugin directory structure

Create the base directory structure for the `react-native` plugin.

```
claude-plugins/react-native/
├── .claude-plugin/
├── skills/
│   └── expo-version-fix/
├── package.json
└── README.md
```

**Validation**: Directory structure exists

---

### 2. Write plugin.json manifest

Create `.claude-plugin/plugin.json` with:
- name: "react-native"
- version: "0.1.0"
- description
- author
- keywords: ["react-native", "expo"]

**Validation**: Valid JSON, all required fields present

---

### 3. Write marketplace.json for local dev

Create `.claude-plugin/marketplace.json` for local testing.

**Validation**: Can install plugin locally via `/plugin marketplace add`

---

### 4. Write expo-version-fix SKILL.md

Create `skills/expo-version-fix/SKILL.md` with:
- YAML frontmatter (name, description)
- Expo project detection instructions
- Package manager detection logic
- Post-install workflow
- User feedback instructions

**Validation**:
- Valid YAML frontmatter
- Description contains trigger keywords
- Instructions are clear and actionable

---

### 5. Create package.json for workspace

Create `package.json` with:
- name: "@m0n0lab/plugin-react-native"
- private: true

**Validation**: `pnpm install` recognizes the package

---

### 6. Write README.md

Document:
- Plugin purpose
- Installation instructions
- Skill behavior description
- Expo project requirements

**Validation**: README exists with required sections

---

### 7. Update root marketplace.json

Add `react-native` plugin entry to `.claude-plugin/marketplace.json`.

**Validation**: Plugin listed in marketplace plugins array

---

### 8. Test local installation

1. Add marketplace: `/plugin marketplace add /path/to/monolab`
2. Install plugin: `/plugin install react-native@monolab`
3. Test skill detection in Expo project

**Validation**:
- Plugin installs without errors
- Skill activates on package install requests
- `npx expo install --fix` runs after installation

---

## Dependencies

- Tasks 1-6 can run in parallel
- Task 7 depends on task 2 (plugin manifest must exist)
- Task 8 depends on all previous tasks
