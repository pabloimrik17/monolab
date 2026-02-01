## 1. Plugin Structure

- [x] 1.1 Create `claude-plugins/experiments/` directory
- [x] 1.2 Create `.claude-plugin/plugin.json` manifest
- [x] 1.3 Create `package.json` with `@m0n0lab/plugin-experiments` name and `private: true`
- [x] 1.4 Create `README.md` documenting the plugin

## 2. Hello Command

- [x] 2.1 Create `commands/` directory
- [x] 2.2 Create `commands/hello-experiments.md` with purpose explanation

## 3. Marketplace Registration

- [x] 3.1 Add experiments entry to `.claude-plugin/marketplace.json`

## 4. Verification

- [x] 4.1 Run `pnpm install` to verify workspace recognition
- [x] 4.2 Test `/plugin install experiments@monolab` locally
