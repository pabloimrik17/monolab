# Add TypeScript Node Library Configuration

## Why
Node.js libraries (utility packages, CLI tools) in the monorepo need a specialized TypeScript configuration that extends the node base config with library-specific settings for type declarations and Node.js-compatible output.

## What Changes
- Add `tsconfig.node.lib.json` in the root directory
- Extend from `tsconfig.node.base.json`
- Configure compiler options specific to Node.js libraries (declaration files required, optimized for publishing)
- Enable composite builds and declaration maps for TypeScript project references

## Impact
- Affected specs: typescript-config (MODIFIED)
- Affected code: Root `tsconfig.node.lib.json` (new file)
- Depends on: MON-118 (tsconfig.node.base.json must exist first)

## Linear Issue
- Issue ID: MON-32
- Issue URL: https://linear.app/monolab/issue/MON-32/tsconfig-node-lib
- Branch Name: feature/mon-32-tsconfig-node-lib
