## MODIFIED Requirements

### Requirement: Generic package.json bumps via npm-check-updates

For each `manifestBumps` element (a `package.json` `sourceFile`), the skill SHALL invoke `npm-check-updates@21.0.2` exactly once via the package-manager runner prefix (`pnpm dlx`, `npx -y`, `yarn dlx`, `bunx`, `deno run --allow-read --allow-net npm:`):

```bash
<runner-prefix> npm-check-updates@21.0.2 -p <packageManager> --target <ncuTarget> --upgrade --removeRange --packageFile <sourceFile> [--cooldown <period>] [--enginesNode] [--filter "<names>"]
```

The skill SHALL resolve `<ncuTarget>` from the `target` input via the same table `scan-npm-updates` uses (NOT passing `target` verbatim):

| `target` (= level) | `<ncuTarget>` | extra flag |
| --- | --- | --- |
| `patch` | `patch` | — |
| `minor` | `minor` | — |
| `major` | `latest` | — |
| `engines` | `latest` | `--enginesNode` |

`-p <packageManager>` SHALL always be passed (mirror scan semantics, prevent ncu auto-detect drift). `--cooldown` SHALL be included when `cooldown` is set and omitted for `pnpm`. `--enginesNode` SHALL be included only when `target` is `engines`.

**`--removeRange` SHALL always be passed**, at every level and every bump type: each bumped dependency is written as an **exact version** (no `^`/`~`/range operator) — e.g. `"react": "19.0.2"`, not `"^19.0.2"`. This is a deliberate, family-wide behavior change (the whole update cascade pins exact); it is NOT byte-equivalent to the pre-change patch/minor output, which preserved the existing range operator. Override-managed families (run via `overrideCommands`) pin according to their own upgrade tool and are out of scope of this rule.

`--filter "<names>"` (the element's `names`, space-separated, double-quoted) SHALL be included when `includeFilter` is `true`. Additionally, when `<ncuTarget>` resolves to `latest` (i.e. `target` is `major` or `engines`), the skill SHALL ALWAYS include `--filter "<names>"` regardless of the element's `includeFilter` value — the caller's `names` list is authoritative. This is required because `scan-npm-updates` produces the `latest`-level candidate set by running `ncu --target latest` and then post-filtering (e.g. major-only); running `ncu --target latest` without `--filter` would bump every dependency with any newer version, exceeding the accepted set. For `patch`/`minor` targets `--filter` is omitted when `includeFilter` is `false`.

The skill SHALL stream `ncu` stdout/stderr to the user verbatim.

If `ncu` exits non-zero for a manifest, the skill SHALL stop immediately and return a structured failure `{ step: "ncu", sourceFile, exitCode, appliedSoFar }` without printing any consumer-specific abort message.

#### Scenario: One ncu invocation per manifest

- **WHEN** the spec has two distinct `package.json` source files
- **THEN** the skill invokes `npm-check-updates@21.0.2` exactly once per file, with `-p <pm> --target <ncuTarget> --upgrade --removeRange --packageFile <sourceFile>`

#### Scenario: Exact pin at all levels via --removeRange

- **WHEN** the skill bumps `react` to `19.0.2` (any level)
- **THEN** the written `package.json` value is `"react": "19.0.2"` with no `^`/`~` prefix
- **AND** the same exact-pin rule applies to `patch`, `minor`, `major`, and `engines` bumps

#### Scenario: Major maps to latest and always filters

- **WHEN** the skill is invoked with `target: "major"` and a `manifestBumps` element `{ names: ["react", "react-dom"], includeFilter: false }`
- **THEN** the ncu invocation uses `--target latest --removeRange` and includes `--filter "react react-dom"` despite `includeFilter` being `false`
- **AND** no dependency outside `["react", "react-dom"]` is bumped

#### Scenario: Patch/minor pin exact (intentional change, not byte-equivalent)

- **WHEN** the skill is invoked with `target: "minor"` and an element with `includeFilter: false`
- **THEN** the ncu invocation uses `--target minor --removeRange` and omits `--filter`
- **AND** the bumped deps are written as exact versions (a deliberate change from the pre-change `^`-preserving output)

#### Scenario: ncu failure returns structured failure, not consumer copy

- **WHEN** `ncu` exits non-zero on a manifest
- **THEN** the skill stops, returns `{ step: "ncu", sourceFile, exitCode, appliedSoFar }`, and does NOT run the install or any override command
- **AND** the skill does NOT print a `Re-run /experiments:...` or `Stopping the run...` line (the caller owns that copy)

---

### Requirement: pnpm-workspace.yaml catalog edits

For each `catalogEdits` element (`sourceFile === "pnpm-workspace.yaml"` semantics), the skill SHALL locate the matching key under the top-level `catalog:` block and replace its value with the **exact** version — `targetVersion` with any leading range operator (`^`/`~`/`=`) stripped — preserving surrounding whitespace, comments, and other keys' order. This keeps catalog entries consistent with the exact-pin rule applied to `package.json` bumps. The skill SHALL NOT touch any consumer `package.json` entry that is a `catalog:` reference.

If a catalog key is unexpectedly missing, the skill SHALL stop and return `{ step: "catalog", name, exitCode: null, appliedSoFar }`.

#### Scenario: Catalog value pinned exact in place

- **WHEN** `catalogEdits` includes `{ name: "zod", targetVersion: "^3.24.1" }`
- **THEN** the skill rewrites the `zod` key under `catalog:` in `pnpm-workspace.yaml` to `3.24.1` (exact, prefix stripped)
- **AND** does NOT invoke `npm-check-updates` for the catalog file

#### Scenario: Consumer catalog reference untouched

- **WHEN** a consumer `package.json` declares `"zod": "catalog:"`
- **THEN** the skill does NOT modify that `package.json`

---

### Requirement: Level-agnostic operation

The skill SHALL contain no level-specific branching logic; behavior is parameterized solely by `target`. The `target` input SHALL be mapped to an `ncuTarget` (`patch→patch`, `minor→minor`, `major→latest`, `engines→latest`+`--enginesNode`) threaded through every `ncu --target` call, `--removeRange` is applied uniformly, and the same skill SHALL serve `patch`, `minor`, `major`, and `engines` callers via that single mapping. The validation list for `target` remains `patch|minor|major|engines`.

#### Scenario: Minor target threads through unchanged behaviorally

- **WHEN** the skill is invoked with `target: "minor"`
- **THEN** every `ncu` invocation uses `--target minor --removeRange` and no behavior differs from a `patch` invocation beyond the mapped target

#### Scenario: Major target resolves through the mapping

- **WHEN** the skill is invoked with `target: "major"`
- **THEN** every `ncu` invocation uses `--target latest --removeRange` with `--filter` always applied, and no other behavior differs from a `minor` invocation beyond the mapped target and forced filter
