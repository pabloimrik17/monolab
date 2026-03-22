## 1. Plugin structure

- [ ] 1.1 Create `claude-plugins/experiments/skills/hookify/` directory
- [ ] 1.2 Create `SKILL.md` with frontmatter (name, description, version) and full skill prompt

## 2. Skill prompt content

- [ ] 2.1 Write section-filtering logic instructions (skip `<!-- X start/end -->` blocks)
- [ ] 2.2 Write instruction classification criteria (hookifiable vs not)
- [ ] 2.3 Write prioritization heuristic (gain factors: frequency, determinism, tokens, impact)
- [ ] 2.4 Write single-proposal presentation format (original instruction, hook type, rationale)
- [ ] 2.5 Write confirmation flow (ask user, stop if declined)
- [ ] 2.6 Write hook generation instructions (bash script template, settings.json update, source removal)
- [ ] 2.7 Write jq availability check instruction
- [ ] 2.8 Write "nothing to hookify" happy-path message

## 3. Validation

- [ ] 3.1 Verify skill appears in `/experiments:hookify` after plugin reload
- [ ] 3.2 Test against project CLAUDE.md (should report nothing — all managed sections)
- [ ] 3.3 Test against project-root CLAUDE.md with a hookifiable rule (should propose hookifying it)
