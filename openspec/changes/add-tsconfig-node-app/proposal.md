# Add TypeScript Node Application Configuration

## Why
Node.js applications (including Hono APIs and CLI tools) need a specialized TypeScript configuration that extends the node base config with application-specific settings optimized for executable Node.js apps.

## What Changes
- Add `tsconfig.node.app.json` in the `packages/ts-configs/` directory
- Extend from `./tsconfig.node.base.json`
- Configure compiler options specific to Node.js applications (no declaration files needed, optimized for runtime)
- Set up output settings appropriate for backend applications

## Impact
- Affected specs: typescript-config (MODIFIED)
- Affected code: `packages/ts-configs/tsconfig.node.app.json` (new file)
- Depends on: MON-118 (tsconfig.node.base.json must exist first)

## Linear Issue
- Issue ID: MON-30
- Issue URL: https://linear.app/monolab/issue/MON-30/tsconfig-node-app
- Branch Name: feature/mon-30-tsconfig-node-app
