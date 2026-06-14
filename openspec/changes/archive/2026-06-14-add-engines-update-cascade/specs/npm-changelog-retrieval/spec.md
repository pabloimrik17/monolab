## ADDED Requirements

### Requirement: Engine release-note retrieval

In addition to npm-registry package changelogs, the skill SHALL retrieve **engine release notes** for the toolchain engines (`node`, `pnpm`, `npm`, `yarn`, `deno`, `bun`) over a `current → target` version range, keyed by engine name plus version range, and cached using the same caching mechanism as package changelogs. Canonical sources per engine:

- **node** — the Node release record (`https://nodejs.org/dist/index.json` for the version set; release notes from `github.com/nodejs/node` releases / `nodejs.org/en/blog`).
- **pnpm / yarn / npm** — their GitHub Releases / `CHANGELOG`.
- **deno / bun** — their GitHub Releases.

When notes for a requested engine/version cannot be retrieved, the skill SHALL emit the existing `_no changelog available_` sentinel rather than fabricating content. Engine retrieval reuses the existing per-version body + source-link output shape so downstream `## Changelogs` / `## Breaking changes & migration` rendering is unchanged.

#### Scenario: Node release notes retrieved by range

- **WHEN** the skill is asked for `node` notes from `24.12.0 → 26.0.0`
- **THEN** it returns the per-version release notes (with source links) for the stable releases in that range, cached for reuse

#### Scenario: Missing engine notes use the sentinel

- **WHEN** release notes for a requested engine/version are unavailable
- **THEN** the skill emits `_no changelog available_` and does not fabricate content

#### Scenario: Package changelog behavior unchanged

- **WHEN** the skill is asked for an npm package's changelog (not an engine)
- **THEN** it behaves exactly as before (Strategy A/B/C resolution), unaffected by the engine path
