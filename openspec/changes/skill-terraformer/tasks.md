## 1. Plugin Structure

- [ ] 1.1 Create `claude-plugins/experiments/skills/skill-terraformer/` directory
- [ ] 1.2 Create `SKILL.md` with YAML frontmatter (`name: skill-terraformer`, `description` for auto-trigger on session start)

## 2. Skill Content — Stack Detection

- [ ] 2.1 Write detection rules section: read `package.json` deps, check for `nx.json`, `app.json`, framework configs
- [ ] 2.2 Document detection signals → stack tags mapping (react, expo, nx, next, vite, etc.)

## 3. Skill Content — Curated Manifest

- [ ] 3.1 Define curated list of skills.sh repos and skills with their conditions
- [ ] 3.2 Include universal skills (always applicable) and conditional skills (stack-dependent)
- [ ] 3.3 Format entries so each maps to a `bunx skills add <repo> --skill <name> --agent claude-code -y` command

## 4. Skill Content — Installation Flow

- [ ] 4.1 Write instructions for querying installed skills: `bunx skills list --json`
- [ ] 4.2 Write diff logic: applicable skills minus already-installed
- [ ] 4.3 Write installation instructions per pending skill with `bunx skills add`
- [ ] 4.4 Write error handling: report failures, continue with remaining

## 5. Skill Content — Postinstall Management

- [ ] 5.1 Write check for existing `postinstall` script in root `package.json`
- [ ] 5.2 Write logic for adding/appending `bunx skills experimental_install` to postinstall
- [ ] 5.3 Write advisory note about committing `skills-lock.json`

## 6. Plugin Metadata Update

- [ ] 6.1 Bump `claude-plugins/experiments/.claude-plugin/plugin.json` version
- [ ] 6.2 Update `.claude-plugin/marketplace.json` version if needed

## 7. Validation

- [ ] 7.1 Verify skill appears in `bunx skills list` or plugin skill listing
- [ ] 7.2 Test skill trigger: invoke in a session and confirm stack detection + diff logic
- [ ] 7.3 Verify postinstall script proposal works correctly
