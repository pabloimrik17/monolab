## 1. Installation

- [x] 1.1 Add `markdownlint-cli@^0.44.0` to devDependencies in `package.json`
- [x] 1.2 Run `pnpm install` to install the dependency

## 2. Configuration

- [x] 2.1 Add markdownlint rule to `lint-staged.config.ts`: `"*.md": "markdownlint --fix"`
- [x] 2.2 Create `.markdownlintignore` file with exclusions:
  - openspec/
  - .claude/
  - .opencode/
  - node_modules/
  - dist/
  - coverage/
  - AGENTS.md
  - CLAUDE.md
- [ ] 2.3 (Optional) Create `.markdownlintrc` file with custom rule configuration if needed

## 3. Testing

- [ ] 3.1 Create a test markdown file with known linting issues (trailing spaces, inconsistent lists)
- [ ] 3.2 Stage the test file and verify markdownlint runs via git hook
- [ ] 3.3 Verify fixable issues are automatically corrected
- [ ] 3.4 Create a test markdown file with unfixable errors
- [ ] 3.5 Verify unfixable errors block the commit
- [ ] 3.6 Verify files in `.markdownlintignore` directories are not linted

## 4. Documentation

- [ ] 4.1 Update `openspec/project.md` to document markdownlint in "Quality & Linting Tools" section (if not already present)
- [ ] 4.2 Update `openspec/project.md` to mention markdownlint in "Git Hooks" section under pre-commit workflow

## 5. Validation

- [ ] 5.1 Run `pnpm exec lint-staged` manually to verify markdownlint integration works
- [ ] 5.2 Commit all changes related to markdownlint configuration
- [ ] 5.3 Verify all markdown files in the repository pass markdownlint checks (or are appropriately excluded)
