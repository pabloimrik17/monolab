## 1. detect-toolchain-surfaces (engine-surface-scanning)

- [x] 1.1 Add a `.dvmrc` row to the v1 matcher table: Surface `.dvmrc`, Engine `deno`, read locus = whole-file version token (trim whitespace, strip/preserve a leading `v`); mirror the `.nvmrc`/`.node-version` row
- [x] 1.2 Add `.dvmrc` → `file` to the "Locus identifiers" list (whole file), alongside `.nvmrc`/`.node-version`
- [x] 1.3 Update the GitHub Actions matcher note so `denoland/setup-deno` with `with.deno-version-file` is read as a pointer to the referenced file — NOT recorded as an inline version surface nor as an `unknownSurface`
- [x] 1.4 Ensure the workspace/repo-level scanning prose lists `.dvmrc` among repo-level runtime files (scanned once at the root, like `.nvmrc`) and that it is classified `runtime` unconditionally
- [x] 1.5 Update the frontmatter `description` to mention `.dvmrc` in the scanned surfaces list

## 2. apply-engine-bumps (engine-update-apply)

- [x] 2.1 In the "Docker, version-manager, and `.nvmrc` loci" section, add `.dvmrc` to the whole-file token rewrite rule (preserve any leading `v`), same surgical treatment as `.nvmrc`/`.node-version`
- [x] 2.2 Update the frontmatter `description` so the aligned-surfaces list includes `.dvmrc`

## 3. Verify against monolab

- [x] 3.1 Sanity-check the updated matcher against monolab's actual config: root `.dvmrc` (`2.9.0`), `engines.deno`/`devEngines.runtime` (`2.9.0`), and the `release-please.yml` `deno-version-file: .dvmrc` step — confirm one deno runtime surface for `.dvmrc`, no double-count from the CI step, and no false misalignment
- [x] 3.2 Run `openspec validate --change add-dvmrc-deno-surface` and resolve any issues
