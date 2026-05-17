## 1. Plugin Structure

- [x] 1.1 Create `skills/` directory in `claude-plugins/experiments/`
- [x] 1.2 Create `skills/skills-update-check/` subdirectory

## 2. Skill Implementation

- [x] 2.1 Create `skills/skills-update-check/SKILL.md` with frontmatter (`name`, `description`)
- [x] 2.2 Write package runner detection logic section (lockfile priority → global binary → npx fallback)
- [x] 2.3 Write update check workflow section (`<runner> skills check -g` + three output states)
- [x] 2.4 Write once-per-session instruction and non-blocking execution guidance
- [x] 2.5 Write user confirmation flow for updates (`<runner> skills update -g`)

## 3. Plugin Updates

- [x] 3.1 Update `README.md` to document the new skill
- [x] 3.2 Bump plugin version in `plugin.json`
- [x] 3.3 Bump plugin version in `marketplace.json`
- [x] 3.4 Bump plugin version in `package.json`

## 4. Validation

- [x] 4.1 Validate plugin structure with `claude plugins validate claude-plugins/experiments/`
- [ ] 4.2 Manual test: invoke skill in a fresh session, verify runner detection and check output
