# Proposal

## Why

The repository moved to Node.js 26.13.1 and pnpm 12.21.0, but four current specifications still state Node.js 24.21.0 or pnpm 12.14.0 as the required version.

## What Changes

- `http-client-package`: the npm metadata scenario requires pnpm `12.21.0`.
- `types-package`: the publishing configuration scenario requires pnpm 12.21.0 in `engines` and `packageManager`.
- `typescript-config`: the Node application and Node base configurations target the Node.js 26.13.1 runtime.
- `ci-github-actions-pinning`: the nx-set-shas requirement names 26.13.1 as the current `.nvmrc` version. Its title keeps "Node 24 runtime", which is the `using: node24` runtime that `nrwl/nx-set-shas` declares in its own `action.yml`, independent of `.nvmrc`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `http-client-package`: pnpm version in the npm metadata scenario.
- `types-package`: pnpm version in the publishing configuration scenario.
- `typescript-config`: Node.js runtime version in the Node application and Node base configurations.
- `ci-github-actions-pinning`: current `.nvmrc` version named in the nx-set-shas requirement.

## Impact

Specifications only. The manifests, `.nvmrc` and `devEngines.runtime` already carry these versions. No package code or exports change; no attw validation needed.
