# Design

## Context

- `add-osv-scanner-via-mise` (merged in #450, not yet archived) set up the base this change builds on:
    - `mise.toml` and `mise.lock` (linux-x64, macos-arm64, macos-x64), with `min_version = "2026.10.0"`.
    - `.husky/pre-push`, which checks for mise, exports `MISE_EXEC_AUTO_INSTALL`/`MISE_AUTO_INSTALL` and runs osv-scanner in report-only mode.
    - The `cve` job in `ci.yml`. It installs mise through `jdx/mise-action`, pinned by SHA.
- `.husky/pre-commit` runs `validate-branch-name` and then `lint-staged --hide-all`. It does not use mise yet.
- The lint job in `ci.yml` checks out with `fetch-depth: 0` and `filter: tree:0`. In a treeless clone, every blob a history scan reads is fetched lazily, one at a time.
- Measured on 2026-11-19:
    - gitleaks 8.30.1 with `--log-opts="--remerge-diff HEAD"` scans the 640 commits reachable from `HEAD` in about 0.8 s.
    - The only finding is the `finnhub-access-token` False positive in `packages/investlab-quotes/src/data/server/infra/http/finnhub.client.ts` (commit `61d57a52`). That rule has no entropy threshold, so `FinnhubResponseError`, exactly 20 alphanumeric characters after `FinnhubUpstreamError =`, passes as a token.
- GitHub secret scanning and push protection are enabled on the repository and show 0 alerts. Non-provider patterns and validity checks are off.

## Goals / Non-Goals

**Goals:**

- Hooks and CI run the same pinned gitleaks with the same `.gitleaks.toml`.
- Each kind of exception is recorded in one place, in a form that cannot hide a new leak.
- The scan blocks from the first commit, because history is clean once the False positive is recorded.

**Non-Goals:**

- zizmor, actionlint, moving knip to pre-push, the detached-HEAD branch check and the commitlint/branch-name CI backstop. Tasks `agentic-task-6c2p.19` and `.29` cover them.
- SARIF upload to code scanning. GitHub secret scanning already feeds the Security tab, and every Secret scan finding blocks until fixed, so there is nothing to track there.
- A scheduled scan. See "CI scans the full history".
- Rewriting history.

## Decisions

### gitleaks 8.30.1, not Betterleaks

gitleaks has been feature-frozen since 2026-05 and still gets security patches. 8.30.1 is its latest release, and its aqua checksums are already proven in other repositories.

- Alternative: Betterleaks v1. It reads `.gitleaks.toml` unchanged, so switching later means changing only the `mise.toml` entry. Rejected for now: v1.10.1 is younger than the repository's 14-day `minimumReleaseAge`, and v2 (in release candidates) drops `.gitleaksignore` and `.gitleaks.toml` auto-loading. Spike `agentic-task-6c2p.48` measures the switch.

### Two exception mechanisms, one per kind

`.gitleaks.toml`:

```toml
[extend]
useDefault = true

[[allowlists]]
description = "False positive: Finnhub type names such as FinnhubResponseError fill the 20-character token slot of finnhub-access-token; real Finnhub tokens are lowercase"
targetRules = ["finnhub-access-token"]
regexes = ['''^Finnhub\w*Error$''']
```

- **False positive**: a pattern on the matched text (the regex target defaults to the secret), scoped with `targetRules` to the rule that misfired. A pattern still matches after the code moves, and it cannot silence any other rule. A lowercase 20-character token still matches `finnhub-access-token`; this was checked against a fake one.
- **Revoked secret**: a line in `.gitleaksignore` holding the fingerprint gitleaks prints (`<commit>:<file>:<rule>:<line>`), preceded by `# revoked YYYY-MM-DD: <provider, reason>`. A fingerprint names one commit, so the same credential added in a new commit fails again. The file is created only when the first Revoked secret occurs.
- Alternative: fingerprints for False positives. Rejected: the working-tree fingerprint carries a line number, so it breaks on the first edit above it, and the commit fingerprint covers only that one commit.
- Alternative: an inline `gitleaks:allow` comment. Rejected: it does not cover commit `61d57a52`, which the full-history scan reads.

gitleaks loads `.gitleaks.toml` and `.gitleaksignore` from the scanned directory, so hooks and CI need no `--config` flag.

### Hooks call gitleaks directly through mise

`.husky/pre-commit`:

```sh
command -v mise >/dev/null 2>&1 || { echo "pre-commit: install mise (https://mise.jdx.dev/getting-started.html) to run the git hooks"; exit 1; }
# With auto-install off, mise x would run any same-named binary on PATH instead of the pinned one.
export MISE_EXEC_AUTO_INSTALL=true MISE_AUTO_INSTALL=true
validate-branch-name
# If this hook is killed, restore hidden work from the "lint-staged automatic backup" stash with git stash apply.
pnpm exec lint-staged --hide-all --config lint-staged.config.ts
mise x -- gitleaks git --pre-commit --staged --redact -v --no-banner
```

- gitleaks runs after lint-staged, so it reads the index as lint-staged's fixers left it. `--staged` reads only the index, and unstaged work never reaches the commit anyway.
- `-v` prints the rule, file and line. Without it gitleaks reports only a count.
- Alternative: run it as a lint-staged task. Rejected: lint-staged hands file lists to its tasks, gitleaks reads the index itself, and placing it after the last fixer inside lint-staged's ordered steps adds nothing over a hook line.

`.husky/pre-push` gains a gitleaks line before osv-scanner, and its mise hint names the git hooks instead of only osv-scanner:

```sh
mise x -- gitleaks git --redact -v --no-banner --log-opts="--remerge-diff HEAD --not --remotes"
```

- `HEAD --not --remotes` selects the commits no remote-tracking branch has. On a new branch that is the branch's own commits; when nothing is new, gitleaks scans 0 bytes and exits 0.
- `--remerge-diff` shows what each merge commit changed relative to an automatic merge, so a credential added while resolving conflicts is scanned. It needs git 2.36 or newer.
- It looks at `HEAD`, not at each ref being pushed. A stdin-parsing script with per-ref ranges was built in the pilot repository and dropped in review as over-engineering. CI is the authority.

### CI scans the full history in an inline `secrets` job

```yaml
secrets:
    runs-on: ubuntu-latest
    permissions:
        contents: read
    steps:
        - uses: actions/checkout@<SHA used by cve-scan.yml> # v7.0.1
          with:
              fetch-depth: 0
              persist-credentials: false
        - uses: jdx/mise-action@90f833d396d0cc3674b631d2d225e306476c303a # v5.2.10
          with:
              version: <same as cve-scan.yml>
              install_args: gitleaks
        - run: gitleaks git --redact -v --no-banner --log-opts="--remerge-diff HEAD"
```

`main.needs` becomes `[lint, tests, build, cve, secrets]`.

- **Full history every time.** The scan costs under a second. A range scan misses three cases:
    - a gitleaks bump or a narrowed `.gitleaks.toml` that now matches an old commit (the Renovate pull request touches only `mise.toml`, so a range scan of it finds nothing);
    - commits that skipped the hooks;
    - the 640 commits that predate the scan.

  It also needs no range logic (`base.sha..head.sha`, force-pushes, stale bases).
- **`--log-opts="--remerge-diff HEAD"`, not the default.** gitleaks' default log options include `--all`, and a `fetch-depth: 0` checkout fetches every branch, so the default would also scan unmerged branches such as Renovate's. `HEAD` is the merge commit on pull requests and the pushed commit on pushes.
- **No cron.** The result changes only when history, `.gitleaks.toml`, `.gitleaksignore` or the pinned gitleaks changes, and every one of those arrives through a pull request or a push that this job already scans.
- **Inline job, not a reusable workflow.** `cve-scan.yml` is reusable only so its cron can run it alone. Without a cron that indirection buys nothing.
- **Own job, not a step in lint.** The lint job's `filter: tree:0` clone would fetch blobs lazily during the scan, and in a treeless clone such a scan has timed out. A separate job also leaves lint's cache keys untouched.
- `install_args: gitleaks` installs only gitleaks. The action still adds `--locked` because `mise.lock` exists.

## Risks / Trade-offs

- [A gitleaks bump adds a rule that matches an old commit] → The Renovate pull request fails its `secrets` job. Record the match as a False positive or, if it is real, revoke it and record it as a Revoked secret on that branch. This is the intended behaviour of the full-history scan.
- [gitleaks is feature-frozen] → `.gitleaks.toml` stays valid for Betterleaks v1. Spike `agentic-task-6c2p.48` decides the switch.
- [Committing now needs mise] → The hint names the install page. Agents get mise in their worktrees through the worktrunk post-start, and README already requires it for pushing. The Pullfrog workflow commits on a runner without mise, so it gains a `jdx/mise-action` step that installs gitleaks before the agent runs. Its pushes pin `core.hooksPath` to `.git/hooks`, so only the pre-commit hook reaches it.
- [mise start-up adds about 0.6 s to every commit] → It stays within the pre-commit budget of under 5 s. The scan itself takes about 0.2 s on a typical staged diff.
- [Some overlap with GitHub push protection] → The two are complementary. Push protection covers provider tokens with validity checks on GitHub's side. gitleaks runs before the commit exists and covers patterns GitHub does not.
- [This change and `add-osv-scanner-via-mise` both modify `ci-job-layout`] → This delta is written on top of that one (five jobs). Archive `add-osv-scanner-via-mise` first; archiving this change first would let that archive overwrite the requirement with four jobs.

## Migration Plan

One pull request from `feature/add-gitleaks` to `develop`. Its own CI run is the proof: the `secrets` job scans the full history with the False positive recorded and passes under `main`.

Rollback: drop `secrets` from `main.needs` (one line) to make the job advisory, or revert the pull request.
