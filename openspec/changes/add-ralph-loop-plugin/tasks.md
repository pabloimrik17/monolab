## 1. Plugin Scaffold

- [ ] 1.1 Create `claude-plugins/ralph-loop/` directory
- [ ] 1.2 Create `.claude-plugin/plugin.json` manifest
- [ ] 1.3 Create `package.json` with workspace integration
- [ ] 1.4 Register in `/.claude-plugin/marketplace.json`

## 2. Help Command

- [ ] 2.1 Create `commands/help.md` with technique overview
- [ ] 2.2 Include origins (Geoff Huntley, 2025)
- [ ] 2.3 Document when to use / not use
- [ ] 2.4 Add cost and safety considerations
- [ ] 2.5 Include reference links

## 3. Generate Skill

- [ ] 3.1 Create `skills/generate.md` skill file
- [ ] 3.2 Implement platform detection logic in skill instructions
- [ ] 3.3 Define bash script template with:
  - While loop structure
  - Max iterations guard
  - PROMPT.md integration
  - Git commit option
- [ ] 3.4 Define PowerShell script template
- [ ] 3.5 Include safety warnings in output
- [ ] 3.6 Add PROMPT.md template generation

## 4. PROMPT.md Template

- [ ] 4.1 Create declarative task description section
- [ ] 4.2 Add completion criteria section
- [ ] 4.3 Add constraints section
- [ ] 4.4 Add context section for relevant files

## 5. Documentation

- [ ] 5.1 Create `README.md` for the plugin
- [ ] 5.2 Document installation and usage
- [ ] 5.3 Provide example use cases

## 6. Validation

- [ ] 6.1 Test plugin loads with `claude --plugin-dir`
- [ ] 6.2 Verify `/ralph-loop:help` works
- [ ] 6.3 Test generate skill on macOS/Linux
- [ ] 6.4 Test generate skill creates valid bash syntax
- [ ] 6.5 Verify PROMPT.md template is generated
