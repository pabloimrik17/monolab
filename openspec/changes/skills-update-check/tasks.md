## 1. Plugin Structure

- [ ] 1.1 Create `skills/` directory in `claude-plugins/experiments/`
- [ ] 1.2 Create `skills/skills-update-check/` subdirectory

## 2. Skill Implementation

- [ ] 2.1 Create `skills/skills-update-check/SKILL.md` with frontmatter (`name`, `description`)
- [ ] 2.2 Write package runner detection logic section (lockfile priority → global binary → npx fallback)
- [ ] 2.3 Write update check workflow section (`<runner> skills check -g` + three output states)
- [ ] 2.4 Write once-per-session instruction and non-blocking execution guidance
- [ ] 2.5 Write user confirmation flow for updates (`<runner> skills update -g`)

## 3. Plugin Updates

- [ ] 3.1 Update `README.md` to document the new skill
- [ ] 3.2 Bump plugin version in `.claude-plugin/plugin.json`

## 4. Validation

- [ ] 4.1 Validate plugin structure with `claude plugins validate claude-plugins/experiments/`
- [ ] 4.2 Manual test: invoke skill in a fresh session, verify runner detection and check output
