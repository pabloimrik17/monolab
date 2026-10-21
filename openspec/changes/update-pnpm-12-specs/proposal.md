# Proposal

## Why

The repository moved its package manager to pnpm 12.14.0, but two current specifications still require pnpm 10.27.0 in the `engines` and `packageManager` fields of the packages they describe.

## What Changes

- `http-client-package`: the package metadata scenario requires pnpm `12.14.0`.
- `types-package`: the publishing configuration scenario requires pnpm 12.14.0 in `engines` and `packageManager`.
- The unarchived `remove-deno-jsr` change carries the same version bump in its own `http-client-package` delta; archive this change first so that delta stays the final text.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `http-client-package`: pnpm version in the package metadata scenario.
- `types-package`: pnpm version in the publishing configuration scenario.

## Impact

Specifications only. No published package changes and no exports change; no attw validation needed.
