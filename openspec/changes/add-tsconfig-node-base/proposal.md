# Add TypeScript Node Base Configuration

## Why
The monorepo needs a shared base TypeScript configuration for Node.js environments to ensure consistent compiler settings across all backend projects, CLI tools, and Node.js libraries.

## What Changes
- Add `tsconfig.node.base.json` in `packages/ts-configs/` directory
- Configure compiler options optimized for Node.js environments (Node types, NodeNext module system)
- Enable this configuration to be extended by Node.js applications and libraries
- Set up proper module resolution for Node.js ecosystem using NodeNext

## Impact
- Affected specs: typescript-config (MODIFIED)
- Affected code: `packages/ts-configs/tsconfig.node.base.json` (new file)
- This becomes the foundation for MON-30 (node apps) and MON-32 (node libs)

## Linear Issue
- Issue ID: MON-118
- Issue URL: https://linear.app/monolab/issue/MON-118/add-tsconfig-node-base
- Branch Name: feature/mon-118-add-tsconfig-node-base
