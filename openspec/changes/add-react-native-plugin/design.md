# Design: React Native Plugin - Expo Version Fix

## Architecture Decision

### Skill vs Hook

**Decision: Skill-based approach**

| Approach | Pros | Cons |
|----------|------|------|
| **Skill** | Context-aware, user transparency, conditional execution | Relies on Claude recognizing trigger |
| **Hook** | Automatic, always runs | Blind execution, runs even if not Expo project |

Skill wins because:

- Not all React Native projects use Expo
- User should know when version fixing happens
- Claude can explain what versions were corrected

## Plugin Structure

```
claude-plugins/react-native/
├── .claude-plugin/
│   ├── plugin.json
│   └── marketplace.json      # For local dev testing
├── skills/
│   └── expo-version-fix/
│       └── SKILL.md
├── package.json              # Workspace integration
└── README.md
```

## Skill Design

### Detection Strategy

The skill detects Expo projects by checking for:

1. `app.json` with `expo` key at root
2. `app.config.js` or `app.config.ts` file
3. `expo` package in `package.json` dependencies

### Trigger Conditions

Skill activates when Claude observes user:

- Running `npm install`, `yarn add`, `pnpm add`, `bun add`, `deno add`
- Running `expo install` (via any package manager) without `--fix`
- Asking to install/update React Native packages
- Asking to upgrade Expo SDK

### Workflow

```
1. User requests package installation
2. Skill detects: Is this an Expo project?
   - No → proceed normally
   - Yes → continue
3. Claude performs requested installation
4. Claude runs expo install --fix using same package manager:
   - npm install → npx expo install --fix
   - yarn add → yarn dlx expo install --fix
   - pnpm add → pnpm dlx expo install --fix
   - bun add → bunx expo install --fix
   - deno add → deno run -A npm:expo install --fix
5. Claude reports: packages corrected (if any)
```

### Output Behavior

The skill instructs Claude to:

- Run `expo install --fix` using the same package manager as the original install
- Only report if packages were actually modified
- Show which packages had versions corrected

## Integration Points

### Existing Specs

- Follows `claude-code-plugins` directory structure
- Uses `@m0n0lab/plugin-react-native` naming convention
- Included in pnpm workspace

### Future Extensions

The `react-native` plugin is designed for future skills:

- Metro bundler debugging
- React Native upgrade assistance
- Native module linking help
- EAS Build integration

## Alternatives Considered

### PostToolUse Hook on Bash

```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Bash",
      "hooks": [{
        "type": "command",
        "command": "npx expo install --fix 2>/dev/null || true"
      }]
    }]
  }
}
```

**Rejected because:**

- Runs on every Bash command, not just package installs
- Runs even in non-Expo projects
- Silent failures hide issues
- No user awareness
- Hardcodes `npx` instead of detecting correct package manager

### MCP Server

**Rejected because:**

- Overkill for single command
- No persistent state needed
- Skill provides sufficient control
