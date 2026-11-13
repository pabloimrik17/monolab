# Tasks

## 1. Verify the requirements against the implementation

- [ ] 1.1 Run `pnpm run lint:markdownlint` and verify it exits zero using `.markdownlint.jsonc`
- [ ] 1.2 Run `pnpm run lint:markdownlint:schema` and verify the `$schema` version equals the engine version
- [ ] 1.3 Run `openspec validate sync-markdown-linting-spec --strict` and verify it passes

## Workflow follow-up

- Archive this change after the pull request merges; archiving applies the delta to `openspec/specs/markdown-linting/spec.md`.
