# Proposal

## Why

`renovate.json` no longer has the `pnpm dlx` custom managers that the `renovate-config-validation` spec requires: PR #415 moved every ephemeral runner call to `pnpx` and replaced those managers with area-scoped `pnpx` managers. The live spec now contradicts the repository, and CI cannot catch it because it only runs `openspec validate --changes`.

## What Changes

- Modify the requirement "Pinned validator version SHALL be auto-maintained by Renovate" to describe the `pnpx --package <pkg>@<ver>` and `pnpx <pkg>@<ver>` invocation forms.
- Remove the clause requiring the `pnpm dlx|bunx|npx` manager to be retained.
- Keep the coverage of the validator workflow and `lint-staged.config.ts`, and the Renovate bump behavior.
- No code or configuration changes: PR #415 already implements the new behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `renovate-config-validation`: the pinned-validator requirement tracks the `pnpx` invocation forms instead of `pnpm dlx`.

## Impact

- Spec only: `openspec/specs/renovate-config-validation/spec.md` changes when this change is archived.
- Already implemented by `renovate.json`, `.github/workflows/renovate-config-validator.yml` and `lint-staged.config.ts` in PR #415.
- Modifies an existing capability. No new package, export or peer dependency changes.
