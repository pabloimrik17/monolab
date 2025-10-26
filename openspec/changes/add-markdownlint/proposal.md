## Why

Markdown files are used throughout the monorepo for documentation (README.md, package docs, OpenSpec files, AI agent instructions). Inconsistent markdown formatting leads to poor readability, non-standard syntax, and potential rendering issues on GitHub and JSR. Adding markdownlint ensures all markdown follows consistent formatting rules and catches common syntax errors before they reach version control.

## What Changes

- Add `markdownlint-cli@0.44.0` package for markdown linting
- Integrate markdownlint into `lint-staged` pre-commit hooks with auto-fix enabled
- Create `.markdownlintignore` to exclude generated/vendor directories (openspec/, .claude/, .opencode/, node_modules/, dist/, coverage/)
- Configure markdownlint rules via `.markdownlintrc` (using default rules initially)

## Impact

- **Affected specs**: `markdown-linting` (new capability)
- **Affected code**:
  - `package.json` - adds markdownlint-cli dependency
  - `lint-staged.config.ts` - adds "*.md": "markdownlint --fix" rule
  - `.markdownlintignore` - new file for exclusions
  - `.markdownlintrc` - new file for rule configuration (optional, defaults used if omitted)
  - `.husky/pre-commit` - indirectly affected (runs lint-staged)
- **User impact**: All markdown files will be automatically linted and fixed on commit
- **Breaking changes**: None - only enforces formatting standards
