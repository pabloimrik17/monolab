# Implementation Tasks

## 1. Create Configuration File
- [x] 1.1 Verify `tsconfig.web.base.json` exists (MON-117 dependency)
- [x] 1.2 Create `tsconfig.web.lib.json` in packages/ts-configs/
- [x] 1.3 Extend from `./tsconfig.web.base.json`
- [x] 1.4 Enable declaration file generation (declaration: true)
- [x] 1.5 Enable declarationMap for better IDE support

## 2. Configure Library-Specific Options
- [x] 2.1 Enable composite builds for TypeScript project references
- [x] 2.2 Configure outDir for build output (inherited from base)
- [x] 2.3 Set rootDir for consistent output structure (project-specific)
- [x] 2.4 Enable sourceMap for debugging published packages
- [x] 2.5 Ensure tree-shaking friendly output (module: "preserve" from web.base)

## 3. Validation
- [x] 3.1 Validate JSON syntax (TypeScript compiler validated)
- [x] 3.2 Test with React components library (react-clean or react-hooks)
- [x] 3.3 Verify declaration files are generated correctly
- [x] 3.4 Check compatibility with JSR publishing
- [x] 3.5 Test with @arethetypeswrong/cli (attw)

## 4. Documentation
- [x] 4.1 Update Linear issue MON-31 with completion status
- [x] 4.2 Document usage for library packages in README
