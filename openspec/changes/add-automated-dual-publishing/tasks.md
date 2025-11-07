# Implementation Tasks

## 1. Configuration Setup
- [ ] 1.1 Remove POC release configuration from nx.json (delete release section)
- [ ] 1.2 Delete old workflow files (.github/workflows/react-clean-publish.yml and react-hooks-publish.yml)
- [ ] 1.3 Reset all package.json versions to 0.1.0
- [ ] 1.4 Reset all jsr.json versions to 0.1.0 (or create jsr.json for is-even, is-odd if missing)
- [ ] 1.5 Delete existing Git tags locally and remotely (for clean slate)
- [ ] 1.6 Delete existing GitHub releases via GitHub UI or API
- [ ] 1.7 Create .release-please-manifest.json with all packages at 0.1.0
- [ ] 1.8 Create release-please-config.json with extra-files configuration for jsr.json sync
- [ ] 1.9 Create or configure @monolab organization on npm
- [ ] 1.10 Configure npm Trusted Publishers in npm org settings (link GitHub repo)

## 2. Package Configuration
- [ ] 2.1 Update packages/is-even/package.json with scoped name and npm publishConfig
- [ ] 2.2 Create packages/is-even/jsr.json with @monolab/is-even name and version 0.1.0
- [ ] 2.3 Update packages/is-odd/package.json with scoped name and npm publishConfig
- [ ] 2.4 Create packages/is-odd/jsr.json with @monolab/is-odd name and version 0.1.0
- [ ] 2.5 Update packages/react-clean/package.json with scoped name and npm publishConfig
- [ ] 2.6 Sync packages/react-clean/jsr.json to version 0.1.0
- [ ] 2.7 Update packages/react-hooks/package.json with scoped name and npm publishConfig
- [ ] 2.8 Sync packages/react-hooks/jsr.json to version 0.1.0
- [ ] 2.9 Update packages/ts-configs/package.json with scoped name and npm publishConfig
- [ ] 2.10 Sync packages/ts-configs/jsr.json to version 0.1.0
- [ ] 2.11 Verify JSR configuration (jsr.json exports field) for all packages
- [ ] 2.12 Ensure all packages build to valid ESM format

## 3. Workflow Implementation
- [ ] 3.1 Create .github/workflows/release-please.yml for PR creation
- [ ] 3.2 Configure release-please action with manifest mode and monorepo settings
- [ ] 3.3 Create .github/workflows/publish.yml for package publishing
- [ ] 3.4 Implement package detection logic from manifest changes in publish workflow
- [ ] 3.5 Add build step using Nx in publish workflow
- [ ] 3.6 Add npm publish step with provenance flag (no token needed, uses OIDC)
- [ ] 3.7 Add JSR publish step with proper authentication
- [ ] 3.8 Configure workflow permissions (contents: read, id-token: write, pull-requests: write)
- [ ] 3.9 Test OIDC authentication to npm (verify Trusted Publishers setup works)

## 4. Testing & Validation
- [ ] 4.1 Test release-please PR creation on feature branch or fork
- [ ] 4.2 Verify PR contains correct version bumps from 0.1.0 baseline in package.json
- [ ] 4.3 Verify PR contains correct version bumps in jsr.json (synchronized)
- [ ] 4.4 Verify both package.json and jsr.json have matching versions
- [ ] 4.5 Verify PR has correct labels and metadata
- [ ] 4.6 Verify ts-configs is included in release configuration
- [ ] 4.7 Test publish workflow with dry-run or test package
- [ ] 4.8 Verify npm publish works with OIDC authentication (no token)
- [ ] 4.9 Verify JSR publish reads version from jsr.json correctly
- [ ] 4.10 Test failure scenarios (invalid credentials, network errors, version mismatch)

## 5. Initial Release
- [ ] 5.1 Merge implementation branch to main
- [ ] 5.2 Wait for release-please to create first release PR automatically
- [ ] 5.3 Review release PR (versions, changelogs, changed files)
- [ ] 5.4 Run CI checks on release PR
- [ ] 5.5 Merge release PR to trigger publishing
- [ ] 5.6 Monitor publish workflow execution
- [ ] 5.7 Verify packages published successfully to npm (check npm website)
- [ ] 5.8 Verify packages published successfully to JSR (check JSR website)
- [ ] 5.9 Verify GitHub releases created with correct notes

## 6. Documentation
- [ ] 6.1 Document release process in CONTRIBUTING.md or similar
- [ ] 6.2 Document conventional commit requirements for contributors
- [ ] 6.3 Document manual recovery procedures for publish failures
- [ ] 6.4 Document how to add new packages to release automation
- [ ] 6.5 Update README.md with npm and JSR installation instructions

## 7. Cleanup
- [ ] 7.1 Archive this change proposal using openspec archive command
- [ ] 7.2 Close Linear issue MON-121
- [ ] 7.3 Celebrate successful automated releases! 🎉
