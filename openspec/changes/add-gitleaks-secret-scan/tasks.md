# Tasks

One pull request (agentic-task-6c2p.57). No task affects package exports, so no attw validation applies.

## 1. Pin gitleaks and record the False positive

- [x] 1.1 Add `gitleaks = "8.30.1"` to `mise.toml` `[tools]`, run `mise lock`, and verify `mise.lock` holds a `aqua:gitleaks/gitleaks` checksum for linux-x64, macos-arm64 and macos-x64 and that `mise x -- gitleaks version` prints 8.30.1
- [x] 1.2 Create `.gitleaks.toml` with `[extend] useDefault = true` and the `finnhub-access-token` allowlist from design.md, then verify that `mise x -- gitleaks git --redact -v --no-banner --log-opts="--remerge-diff HEAD"` and `mise x -- gitleaks dir --redact -v --no-banner .` both report no leaks, and that a throwaway file outside the repository with a `finnhubToken` constant holding `c0` + 18 lowercase alphanumerics, scanned with `--config .gitleaks.toml` is still found

## 2. Hooks

- [ ] 2.1 Rewrite `.husky/pre-commit` as in design.md: mise check with the one-line hint, the `MISE_EXEC_AUTO_INSTALL`/`MISE_AUTO_INSTALL` exports, then `validate-branch-name` and lint-staged, then `mise x -- gitleaks git --pre-commit --staged --redact -v --no-banner`. Verify that staging a file with a fake AWS key (`AKIA` + 16 uppercase alphanumerics) blocks the commit with the redacted rule, file and line, that a clean commit passes, and that a commit with `PATH` stripped of mise fails with the hint
- [ ] 2.2 Add the gitleaks line from design.md to `.husky/pre-push` before osv-scanner, and change its mise hint to name the git hooks. Verify on a throwaway branch that a commit made with `--no-verify` that adds a fake key blocks the push, that a push with nothing new scans 0 bytes and proceeds, and that a push with `PATH` stripped of mise fails with the hint; delete the throwaway branch and commit afterwards

## 3. CI

- [x] 3.1 Add the `secrets` job to `ci.yml` as in design.md (checkout `3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1` with `fetch-depth: 0`, no `filter`, `persist-credentials: false`; `jdx/mise-action@90f833d396d0cc3674b631d2d225e306476c303a # v5.2.10` with the same `version` as `cve-scan.yml` and `install_args: gitleaks`; `gitleaks git --redact -v --no-banner --log-opts="--remerge-diff HEAD"`) and set `main.needs` to `[lint, tests, build, cve, secrets]`. Verify every `uses:` is SHA-pinned with a `# vX.Y.Z` comment and that `pnpx --package renovate@44.181.6 renovate-config-validator --strict renovate.json` and `pnpm run lint:oxfmt` pass

## 4. Documentation

- [x] 4.1 Add a gitleaks paragraph to README's External tools section: the manual command (`mise x -- gitleaks git --redact -v --log-opts="--remerge-diff HEAD"`), how to tell a False positive from a real credential, how to record each (allowlist in `.gitleaks.toml` scoped to the rule; revoke first, then the fingerprint plus `# revoked YYYY-MM-DD` in `.gitleaksignore`), and that history is never rewritten. Verify the documented command runs as written and `pnpm nx run @m0n0lab/source:lint:markdownlint` passes

## 5. Integration

- [x] 5.1 Run `pnpm exec openspec validate add-gitleaks-secret-scan --strict` and verify it passes
- [ ] 5.2 Open the pull request against `develop` and verify that the `secrets` job starts in parallel with lint, tests, build and cve, scans the full history with no leaks, and that `main` waits for it and is green

## Workflow follow-up

- Archive this change only after `add-osv-scanner-via-mise` is archived (both modify `ci-job-layout`).
- Fleet template: once merged, write the hook lines, `.gitleaks.toml` layout, CI job and exception policy into the notes of agentic-task-6c2p.11–.17 and .20. In the smile note: replace `gitleaks protect --staged` with `gitleaks git --pre-commit --staged -v` after lint-staged, add the pre-push line, and pass `--log-opts` in CI so a full clone does not scan other branches.
- Remove gitleaks from the scope of agentic-task-6c2p.19 and .29 (done in their notes on 2026-11-19).
