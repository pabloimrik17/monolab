# Spike: taze vs ncu — tool decision for `scan-npm-updates`

Executed on monolab monorepo (pnpm 10.27.0, workspaces with `catalog:` + `minimumReleaseAge: 1440`) and a synthetic single-repo fixture. All commands run via `pnpm dlx` on 2026-04-18.

## Versions evaluated

- `taze@19.11.0`
- `npm-check-updates@21.0.2` (aka `ncu`)

## Evidence

### E1 — taze `--json` does not exist

`taze --help` (v19.11.0) enumerates every flag. There is no `--json`, `-o`, `--output`, or equivalent. Attempting `--output json` raises `CACError: Unknown option --output` (CAC dep). Parsing the only available output (ANSI-coloured, column-aligned text) is fragile: widths shift with terminal size and with the `--timediff`/`--nodecompat` annotations visible in this run's output (e.g. `~1.4y`, `>=20.0.0`).

**Implication:** the design contract "skill receives structured updates from the tool" cannot be satisfied with taze without parsing pretty text. The `design.md` rationale for taze ("JSON output directo sin parseo adicional") is factually wrong as of v19.11.0.

### E2 — ncu has `--jsonUpgraded` and it is stable

`--jsonUpgraded` returns a flat `{ name: targetVersion }` object. `--jsonAll` returns the rewritten package manifest. Both documented and stable.

Single-repo fixture (`/tmp/single-repo-fixture` with `chalk@5.4.0`, `lodash@4.17.20`):

```json
{ "chalk": "5.4.1", "lodash": "4.17.23" }
```

Workspace, single package (`apps/wealth-react`):

```json
{
  "react": "19.2.5",
  "react-dom": "19.2.5",
  "@types/react": "^19.0.14",
  "@types/react-dom": "^19.0.6",
  "vite": "6.4.2"
}
```

Caveat: ncu **prints the minimumReleaseAge banner on stdout**, polluting raw stdout capture. Reliable capture needs `--jsonUpgraded` written to a file with `--packageManager pnpm --deep` and/or stripping the leading non-JSON line before parsing. Skill SHALL parse defensively.

### E3 — ncu reads pnpm `minimumReleaseAge` natively

ncu 21.0.2 emits `Using minimumReleaseAge from pnpm-workspace.yaml: 1 day` unprompted when `pnpm-workspace.yaml` declares `minimumReleaseAge: 1440`. No explicit `--cooldown` needed for pnpm. For non-pnpm PMs, `--cooldown <period>` is the explicit equivalent.

**Implication:** the skill's native-support branch for pnpm is actually satisfied by ncu, not taze. The `minimumReleaseAge` lookup table gets an authoritative first entry.

### E4 — taze waterfall semantic confirmed (on packages it evaluates)

`apps/wealth-react` run of `taze patch -r --all`:

```
@types/react      ^19.0.0 → ^19.0.14   (19.2.14 available)
@types/react-dom  ^19.0.0 → ^19.0.6    (19.2.3  available)
```

Both packages have minor/major available but taze proposes the max patch within the current major+minor band. Waterfall confirmed.

ncu `--target patch` on the same package reported identical patch targets for `@types/react` and `@types/react-dom`. On this corpus the waterfall advantage did **not** materialise because every dep's current version sits inside a band that still has patches. Waterfall matters when current version is at the top of an old band; that case didn't appear in monolab today.

### E5 — neither tool dereferences pnpm `catalog:` entries

Taze on `apps/wealth-react` (which uses `vitest: "catalog:"`):

```
@vitest/coverage-v8  catalog: → catalog:
vitest               catalog: → catalog:
```

Taze treats `catalog:` as a pinned literal and does not resolve it against `pnpm-workspace.yaml#catalog`. ncu likewise: `--jsonUpgraded` on the package omits those entries entirely (they are not versioned so nothing to upgrade from ncu's point of view).

**Implication:** catalog handling is a skill post-processing concern in both tools. The cost of catalogs is a wash between tools; neither saves work here. The skill must read `pnpm-workspace.yaml#catalog`, resolve effective current versions, and re-scan those separately (or run ncu against a synthetic package.json that inlines catalog versions).

### E6 — taze missed a patch ncu found on the fixture

Single-repo fixture, both `chalk` (5.4.0 → 5.4.1) and `lodash` (4.17.20 → 4.17.23) available. `ncu --target patch` reports both. `taze patch` reports "dependencies are already up-to-date". Cause unconfirmed (possibly default mode semantics or cache), but it is a reproducible evidence point against taze at v19.11.0 for single-repo use.

### E7 — tool invocation errors

`taze patch -r` on the monorepo produced 19 `Error: Timeout requesting "<pkg>"` entries for common deps (typescript, vite, drizzle-orm, svelte, etc.) on the first run with default concurrency. Retrying with `--concurrency 20` cleared them, but this is flaky for a scripted skill. ncu with `-ws` completed without registry errors in the same session.

## Divergence summary

| Dimension | taze 19.11.0 | ncu 21.0.2 | Winner for skill |
|---|---|---|---|
| Structured output | **None** — ANSI text only | `--jsonUpgraded`, `--jsonAll` | **ncu (hard)** |
| pnpm `minimumReleaseAge` native | No (only `--maturity-period`, days) | **Yes, auto-detected** | **ncu** |
| Non-pnpm cooldown flag | `--maturity-period <days>` | `--cooldown <period>` | Tie |
| Filter semantic for `patch` | **Waterfall** | Cap | taze (weak, see E4) |
| pnpm catalogs dereferenced | No | No | Tie — skill must post-process |
| Workspace scan | `-r` native pnpm detect | `-ws` (+ `--root`) | Tie |
| Multi-PM (npm/yarn/pnpm/bun/deno) | Yes | Yes | Tie |
| Registry stability observed | Timeouts on concurrent scan | Clean | ncu |
| Bug surface observed | Missed patches in single-repo fixture (E6) | None observed | ncu |

## Decision — **switch default to `ncu`; taze becomes deferred option**

Originally `design.md` picked taze with ncu as fallback. The spike invalidates two of taze's premises:

1. **No JSON output** blocks the skill contract outright.
2. **Native pnpm `minimumReleaseAge` support in ncu** removes the main taze-specific win the design anticipated.

Waterfall is a real but minor advantage (E4) and does not justify parsing ANSI text. Recommend switching the skill's default tool to `ncu` and keeping taze only as documentation for a future follow-up if taze gains `--json`.

## Pinned version

**`npm-check-updates@21.0.2`** — latest stable at spike date, known-working across monorepo and fixture.

## Skill adjustments implied by this decision

- Invocation: `<dlx> npm-check-updates@21.0.2 --target <level> --jsonUpgraded --packageFile <file>` per package manifest (skill loops over workspace packages; no `-ws` because output shape is different when `-ws` is on).
- Parse: strip any leading non-JSON banner line before `JSON.parse`.
- Catalogs: skill reads `pnpm-workspace.yaml#catalog`, constructs a synthetic manifest (or uses `npm view <pkg> versions` directly) to evaluate patch candidates for catalog entries, and reports `location: "catalog:default"` / `sourceFile: "pnpm-workspace.yaml"`.
- `minimumReleaseAge`: pnpm is auto-honoured by ncu; for npm/yarn/bun/deno the skill passes `--cooldown <period>` after resolving the setting per PM (lookup table per task 1.4.1).
- Semantic caveat: ncu's `--target patch` is cap-style. For the first release this matches the command name (`npm-update-patch` — expect everything inside the patch band). Document the divergence.

## Open items for the lookup table (task 1.4.1)

The authoritative per-PM `minimumReleaseAge` source is needed before the skill accepts non-pnpm PMs at runtime.

- **pnpm** — `pnpm-workspace.yaml#minimumReleaseAge` (confirmed this run).
- **npm** — `npm config get minimum-release-age` / `minimum-release-age-exclude` (npm 11+). Needs re-check on target fixture before release.
- **yarn** — no known native equivalent; rely on `ncu --cooldown`.
- **bun** — no known native equivalent; rely on `ncu --cooldown`.
- **deno** — no known native equivalent; rely on `ncu --cooldown`.

Skill MUST reject execution on any PM whose lookup is undocumented, per the existing spec requirement.
