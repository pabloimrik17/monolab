# Implementation Tasks

## 1. Create Configuration File
- [x] 1.1 Verify `tsconfig.node.base.json` exists (MON-118 dependency)
- [x] 1.2 Create `tsconfig.node.lib.json` in `packages/ts-configs/` directory
- [x] 1.3 Extend from `./tsconfig.node.base.json`
- [x] 1.4 Enable declaration file generation (inherited from base config)
- [x] 1.5 Enable declarationMap for better IDE support (inherited from base config)

## 2. Configure Library-Specific Options
- [x] 2.1 Enable composite builds for TypeScript project references
- [x] 2.2 Configure outDir for build output (documented as per-project setting)
- [x] 2.3 Set rootDir for consistent output structure (documented as per-project setting)
- [x] 2.4 Enable sourceMap for debugging published packages (inherited from base config)
- [x] 2.5 Ensure Node.js-compatible output (via NodeNext module from base config)

## 3. Validation
- [x] 3.1 Validate JSON syntax
- [x] 3.2 Test with utility libraries (is-even, is-odd)
- [x] 3.3 Verify declaration files are generated correctly
- [x] 3.4 Check compatibility with JSR publishing
- [x] 3.5 Test with @arethetypeswrong/cli (attw)

## 4. Documentation
- [ ] 4.1 Update Linear issue MON-32 with completion status
- [ ] 4.2 Document usage for library packages
