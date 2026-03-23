## 1. Fix Current State

- [ ] 1.1 Verify marketplace.json/plugin.json version consistency for all plugins (no-op if already in sync)

## 2. Create Skill

- [ ] 2.1 Create directory `claude-plugins/experiments/skills/plugin-version-bump/`
- [ ] 2.2 Write `SKILL.md` with trigger-optimized description frontmatter
- [ ] 2.3 Write skill body with semver classification table, file update instructions, multi-plugin/multi-task guidance, and marketplace sync instructions

## 3. Update Specs

- [ ] 3.1 Sync delta specs to `openspec/specs/plugin-version-bump/spec.md` (new)
- [ ] 3.2 Sync delta specs to `openspec/specs/claude-code-plugins/spec.md` (modified — version consistency requirement)
- [ ] 3.3 Sync delta specs to `openspec/specs/experiments-plugin/spec.md` (added — skill registration)

## 4. Bump Plugin Version

- [ ] 4.1 Bump experiments plugin version (minor — new skill added): update `plugin.json`, `package.json`, and `marketplace.json`

## 5. Verify

- [ ] 5.1 Verify skill appears in Claude Code available skills list after plugin reload
- [ ] 5.2 Verify all 3 version files are in sync for both plugins
