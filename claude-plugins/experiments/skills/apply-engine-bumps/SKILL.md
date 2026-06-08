---
name: apply-engine-bumps
description: Use when an engines-level update command (`/experiments:npm-update-engines`, `/experiments:npm-update-deep-engines`, or the `commander-update-orchestrator` at `level=engines`) needs to resolve runtime/package-manager targets and rewrite a project's runtime version loci. Resolves Node→latest LTS and pnpm/npm/yarn/bun/Deno→latest, confirms before any write, then pins + aligns every runtime locus exact (no ranges); leaves publishable-lib support ranges and unknown surfaces untouched. VCS-free — never commits, pushes, opens PRs, runs tests/lint/build, or runs ncu. The engines-level analog of `apply-npm-updates`.
---

# apply-engine-bumps

Given the inventory from `detect-toolchain-surfaces` and a per-engine resolved target, rewrite a project's **`runtime`** version loci to the target and return a structured result fragment. This is the engines-level analog of `apply-npm-updates` (`npm-update-apply`): no `ncu`, and it edits non-`package.json` files (`.nvmrc`, CI YAML, Dockerfiles, version-manager files) as well as `package.json`.

> Authoritative spec: `openspec/changes/add-engines-update-cascade/specs/engine-update-apply/spec.md` (capability `engine-update-apply`).

## VCS-safe contract (hard)

The skill runs in the **working directory handed to it** (branch/worktree isolation, if any, is a separate `update-isolation` pre-step — see `npm-update-engines.md`). It SHALL NOT:

- create commits, push, or open PRs (`git commit`, `git push`, `gh pr create`, …);
- run tests, lint, or build;
- run `ncu` / `npm-check-updates`;
- create a branch or worktree (the caller does that via `update-isolation` before invoking this skill).

It performs surgical version-token writes only, streams the edits it makes, and returns a structured fragment. It does **not** print a consumer-facing summary or abort copy — the caller owns those.

## Inputs

| Field                  | Type                                     | Required | Notes                                                                                                                                                                                                                                                                             |
| ---------------------- | ---------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cwd`                  | `string` (absolute)                      | yes      | The working directory whose loci are rewritten (project root, or an isolation worktree from `update-isolation`).                                                                                                                                                                  |
| `inventory`            | `EngineSurfaceInventory`                 | yes      | The verbatim result of `detect-toolchain-surfaces` for this project.                                                                                                                                                                                                              |
| `resolvedTargets`      | `{ [engine]: string }`                   | no       | Per-engine target supplied by the caller (e.g. cross-project alignment). When omitted, the skill resolves targets itself (see "Target resolution"). When present, the skill uses them verbatim (and still runs the confirm gate unless the caller already confirmed — see below). |
| `ambiguousResolutions` | `{ [locusKey]: "runtime" \| "support" }` | no       | The caller's resolution for each `ambiguous` locus (keyed `file::locus`). Absent ⇒ the locus is left untouched.                                                                                                                                                                   |
| `confirmed`            | `boolean` (default `false`)              | no       | When `true`, the caller has already shown and confirmed the resolved targets (e.g. a command's gate). The skill then skips its own confirm gate. When `false`/absent, the skill shows targets and confirms before any write.                                                      |

The skill SHALL NOT mutate its inputs.

## Target resolution (D4)

Resolve a target version per engine that has at least one bump-eligible `runtime` locus:

- **Node → latest LTS**: fetch `https://nodejs.org/dist/index.json`; pick the **max `version`** whose `lts` field is **not `false`**. Pin the full `x.y.z`.
- **pnpm / npm / yarn / bun → latest**: the registry `latest` dist-tag — `npm view <pm> version`.
- **Deno → latest**: the latest GitHub release tag of `denoland/deno` (`gh api /repos/denoland/deno/releases/latest --jq .tag_name`, strip a leading `v`).

When `resolvedTargets` is supplied for an engine, use it verbatim (do not re-resolve). Cross-project, the orchestrator resolves once and reuses (one target per engine for every project).

### Offline / fetch failure — never fabricate

On a fetch failure or offline for an engine's target source AND no caller-supplied `resolvedTargets[engine]`:

- **skip that engine** with a surfaced note (`skipped[]` entry, reason `target source unreachable`), OR
- accept a user-supplied target if the caller passes one.

The skill SHALL NEVER fabricate, guess, or interpolate a version it could not resolve.

## Confirm gate (before any write)

Unless `confirmed: true`, show the per-engine resolved targets — `node: <current set> → <target>`, `pnpm: … → …`, etc. — and obtain confirmation via `AskUserQuestion` (`apply` / `cancel`) before writing **any** file. On `cancel`, write nothing and return a fragment with empty `applied[]`. When `confirmed: true`, the caller already gated; proceed to write.

## Exact pinning + alignment (D5)

For each engine, rewrite **every** `runtime` locus to the **same exact** resolved version — no ranges (`^`/`~`/`>=`), aligning all runtime surfaces (consistent with the family-wide exact-pin policy). This converges any intra-repo misalignment the inventory flagged.

Edits are **surgical**: only the version token changes; surrounding structure, formatting, comments, and key order are preserved.

### `packageManager` token

For a `package.json` `packageManager` value (`name@X` or `name@X+sha512.…`): preserve the `name@` prefix, replace the version, and **drop the corepack integrity suffix** (`+sha…`) by default (corepack re-resolves it). Record the dropped hash in `droppedHashes[]`. E.g. `pnpm@10.27.0+sha512.abc` with pnpm target `11.0.0` → `pnpm@11.0.0`.

### CI action SHA-pin safety

When rewriting GitHub Actions workflows, change ONLY the version **input** — `with.node-version`, `with.version` (pnpm), `with.deno-version`, `with.bun-version`. NEVER touch the action reference `uses: <action>@<sha>` nor its trailing version comment. E.g. `uses: actions/setup-node@<sha> # v4.4.0` with `node-version: 24.12.0` → only `node-version` changes; `@<sha>` and `# v4.4.0` stay.

### Docker, version-manager, and `.nvmrc` loci

Rewrite only the version token: the `FROM <image>:<tag>` tag and `ARG *_VERSION=` default for Docker; the `<tool> <version>` line for `.tool-versions`/mise; the whole-file token for `.nvmrc`/`.node-version` (preserving any leading `v` convention the file used). Never change the image name/runtime choice or migrate a CI provider.

## What is left untouched

- **`support`** loci (publishable-lib `engines.<engine>` ranges) — NEVER modified.
- **`unknownSurfaces`** — NEVER modified.
- **`ambiguous`** loci — modified ONLY when `ambiguousResolutions[file::locus] === "runtime"`; absent or `"support"` ⇒ left untouched.

## Output — structured result fragment

Return:

```ts
{
    resolvedTargets: { [engine]: string };          // the version used per engine (resolved or caller-supplied)
    applied: Array<{ file, engine, locus, from, to }>;
    skipped: Array<{ file?: string; engine?: string; reason: string }>; // support/unknown/ambiguous-left/offline-skip
    droppedHashes: Array<{ file, from, to, droppedHash }>;              // corepack +sha… drops
    failure?: { step: "resolve" | "write"; file?: string; detail: string };
}
```

Stream each edit as it is made. Do NOT print a consumer summary or abort message — the caller composes those from this fragment.

On a write failure, stop and return `failure: { step: "write", file, detail }` with `applied[]` reflecting what landed before the failure.

## Hard rules

- VCS-free: no commits/push/PRs, no branch/worktree creation, no tests/lint/build, no `ncu` (see "VCS-safe contract").
- Confirm before any write unless `confirmed: true`.
- Pin exact and align all `runtime` loci per engine; never write a range for a runtime locus.
- Preserve the `packageManager` `name@` prefix; drop + report the `+sha…` hash.
- Rewrite only the version input of a GitHub Actions step — never its `@<sha>` pin or version comment.
- Never touch `support` or `unknownSurfaces`; touch `ambiguous` only on caller resolution to `runtime`.
- Never fabricate a version that could not be resolved — skip with a note.

## See also

- `detect-toolchain-surfaces` — produces the `inventory` this skill consumes.
- `apply-npm-updates` — the dependency-level analog; engines is a separate skill (design D1) because it has no `ncu` and edits non-`package.json` files.
- `update-isolation` — the optional branch/worktree pre-step; this skill runs in the `workdir` it returns.
