# Tasks

## 1. Specs

- [x] 1.1 Set the pnpm version to `12.21.0` in the `http-client-package` npm metadata scenario and verify it matches `packages/http-client/package.json`
- [x] 1.2 Set the pnpm version to `12.21.0` in the `types-package` publishing configuration scenario and verify it matches `packages/ts-types/package.json`
- [x] 1.3 Set the Node.js runtime to `26.13.1` in the `typescript-config` Node application and Node base requirements and verify it matches `.nvmrc`
- [x] 1.4 Set the current `.nvmrc` version to `26.13.1` in the `ci-github-actions-pinning` nx-set-shas requirement and verify its title still matches `using: node24` in the pinned `nrwl/nx-set-shas` `action.yml`
- [x] 1.5 Run `pnpx @fission-ai/openspec@1.15.0 validate update-node-26-pnpm-12-21-specs --strict` and verify it passes

## Workflow follow-up

- Archive the change after review so the four main specs take the updated requirement text.
