# Add TypeScript Node Base Configuration

## Why
The monorepo needs a shared base TypeScript configuration for Node.js environments to ensure consistent compiler settings across all backend projects, CLI tools, and Node.js libraries.

## What Changes
- Add `tsconfig.node.base.json` in the root directory
- Configure compiler options optimized for Node.js environments (Node types, appropriate ES targets)
- Enable this configuration to be extended by Node.js applications and libraries
- Set up proper module resolution for Node.js ecosystem

## Impact
- Affected specs: typescript-config (MODIFIED)
- Affected code: Root `tsconfig.node.base.json` (new file)
- This becomes the foundation for MON-30 (node apps) and MON-32 (node libs)
