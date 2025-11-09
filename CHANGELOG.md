# Changelog

All notable changes to this monorepo will be documented in this file.

This changelog tracks changes that affect the entire monorepo, infrastructure, CI/CD, tooling, and cross-cutting concerns. For package-specific changes, see the CHANGELOG.md in each package directory.

## [2.0.0](https://github.com/pabloimrik17/monolab/compare/v1.0.0...v2.0.0) (2025-11-09)


### ⚠ BREAKING CHANGES

* **@monolab/react-clean:** renamed functions, removed cool
* **@monolab/is-odd:** removed isNotOdd

### Features

* **@monolab/is-odd:** added isNotOdd ([eff2f80](https://github.com/pabloimrik17/monolab/commit/eff2f8083ce22b80a97a318ce7423f3730829f44))
* **@monolab/is-odd:** removed isNotOdd ([2062736](https://github.com/pabloimrik17/monolab/commit/20627369460c5354c5b038fedc76b3b559cea5c6))
* **@monolab/is-odd:** test ([65f4b32](https://github.com/pabloimrik17/monolab/commit/65f4b32d03386b1e8e811821456c559864bbed66))
* **@monolab/react-clean:** added cool ([f7e0cd4](https://github.com/pabloimrik17/monolab/commit/f7e0cd41ce2e09c0443911ed1c821d1d7e9f7962))
* **@monolab/react-clean:** added maybeCoolFunction ([09509d0](https://github.com/pabloimrik17/monolab/commit/09509d04fe367f927feb20e08d3cca17b0a71778))
* **@monolab/react-clean:** added soMaybeCoolFunction ([a7bbc99](https://github.com/pabloimrik17/monolab/commit/a7bbc99f312e6a7b82657871efd95bd5b2f31d25))
* **@monolab/react-clean:** renamed functions, removed cool ([830e5d7](https://github.com/pabloimrik17/monolab/commit/830e5d72df4323ef3ff83dfe79cacccc1d61c940))
* **@monolab/ts-configs:** add TypeScript Node.js library configuration ([#67](https://github.com/pabloimrik17/monolab/issues/67)) ([91f6773](https://github.com/pabloimrik17/monolab/commit/91f67730eed433c0f64e5e60b18ff62efc717ae2))
* **@monolab/ts-configs:** add TypeScript web application configuration ([#68](https://github.com/pabloimrik17/monolab/issues/68)) ([b9be669](https://github.com/pabloimrik17/monolab/commit/b9be66932b82058d533cc7ee64a97b39c6769565))
* add mutation testing with Stryker ([40665e5](https://github.com/pabloimrik17/monolab/commit/40665e5c2fb3fb3b1c40c10e10bf4e1aa366e1be))
* add TypeScript Node.js application configuration ([#66](https://github.com/pabloimrik17/monolab/issues/66)) ([51f651b](https://github.com/pabloimrik17/monolab/commit/51f651ba2c94a78eb9dc01c65e568ba1c8dc84f5))
* add TypeScript web library configuration ([#69](https://github.com/pabloimrik17/monolab/issues/69)) ([28b5d51](https://github.com/pabloimrik17/monolab/commit/28b5d5174512d544eb52e723aa27d9b48d51a1cb))
* **ci:** centralize prettier to fix CHANGELOG.md formatting issues ([d6635d6](https://github.com/pabloimrik17/monolab/commit/d6635d6ec79f4f81176f6ba9fab5eb7dd45a5086))
* implement mutation testing with Stryker ([9c758ed](https://github.com/pabloimrik17/monolab/commit/9c758ed1b4480808d03d81cc68d6dfdb10dda317))
* **is-even:** added isNotEven function ([5524a84](https://github.com/pabloimrik17/monolab/commit/5524a844752a4a2e81dd21cb890a8003e45bac6a))
* **release:** add root CHANGELOG.md for monorepo-wide changes ([f5dfcae](https://github.com/pabloimrik17/monolab/commit/f5dfcae581670fa590013020df33c9db2f68863e))


### Bug Fixes

* **@monolab/is-odd:** test ([21348ec](https://github.com/pabloimrik17/monolab/commit/21348ec939c5ea70e0b508375b219d209fd557d8))
* **@monolab/is-odd:** test ([04938d7](https://github.com/pabloimrik17/monolab/commit/04938d70d0a6c5b92ca438bd9e5a419ef18d9cff))
* **@monolab/react-clean:** test ([3e8699a](https://github.com/pabloimrik17/monolab/commit/3e8699a48077643e3d94ffbe5820cb602ac9cc7f))
* **@monolab/react-hooks:** align tsconfig lib ([ee8795f](https://github.com/pabloimrik17/monolab/commit/ee8795f4221255678d71e6b715e6b6e7c3628c95))
* **@monolab/react-hooks:** align tsconfig lib ([8502bc9](https://github.com/pabloimrik17/monolab/commit/8502bc9fa11e8fb6f133631631a2055a99512846))
* **@monolab/react-hooks:** package version ([fc21daa](https://github.com/pabloimrik17/monolab/commit/fc21daa627b8b74715f9e34996c658d14fc8a5f8))
* **@monolab/react-hooks:** package version ([9a03186](https://github.com/pabloimrik17/monolab/commit/9a031867361eb1f9d9aa9abfdf1e43f4f7398ba9))
* **@monolab/react-hooks:** package version ([fcb9515](https://github.com/pabloimrik17/monolab/commit/fcb9515c58547119c1312ed5116e4d05a73efcb6))
* **@monolab/react-hooks:** package version ([ab5cf20](https://github.com/pabloimrik17/monolab/commit/ab5cf20cfae66442fcd846b675e12076dcbd8a01))
* **@monolab/react-hooks:** package version ([a6a3344](https://github.com/pabloimrik17/monolab/commit/a6a334438fa92c90be70506f044b983be34cc255))
* **@monolab/react-hooks:** package version ([4c2a9c4](https://github.com/pabloimrik17/monolab/commit/4c2a9c4cd4d7ff549d7cb536f528ae366ae2572d))
* **ci:** add missing issues:write permission to release-please workflow ([6c8dd9c](https://github.com/pabloimrik17/monolab/commit/6c8dd9cb96bad8708509fd66810766da446f5283))
* **ci:** ignore CHANGELOG.md in per-package prettier checks ([26746a7](https://github.com/pabloimrik17/monolab/commit/26746a72f088c3ecdb5fe899f549f52359712143))
* **ci:** missing token and release type ([623a95d](https://github.com/pabloimrik17/monolab/commit/623a95df892cf334c67149d730affdc06d70162b))
* **ci:** remove release-type from manifest mode configuration ([1a3ccf4](https://github.com/pabloimrik17/monolab/commit/1a3ccf4cf028cfa0d70e8ae9a7c2382bed5c0b77))
* codecov badge link ([d622855](https://github.com/pabloimrik17/monolab/commit/d62285583b189c566ef7f0978dc96ea22992deac))
* codecov badge link ([#41](https://github.com/pabloimrik17/monolab/issues/41)) ([3fff18b](https://github.com/pabloimrik17/monolab/commit/3fff18bc04237399ac59cf0840417755a8fff47b))
* **deps:** pin dependencies ([#29](https://github.com/pabloimrik17/monolab/issues/29)) ([5b9e68d](https://github.com/pabloimrik17/monolab/commit/5b9e68d23a86a0cb4f89114ddac3adda0a6e2122))
* **deps:** update dependency solid-js to v1.9.9 ([#37](https://github.com/pabloimrik17/monolab/issues/37)) ([20da04d](https://github.com/pabloimrik17/monolab/commit/20da04d2c7d961e4624b513b00e56c90db5b8fa5))
* improve mutation testing with inPlace mode and enhanced test coverage ([3ff8594](https://github.com/pabloimrik17/monolab/commit/3ff85944f916594f923dadbe53a3fe5f7d8909d6))
* mutation test ([8e8943b](https://github.com/pabloimrik17/monolab/commit/8e8943bcd8d08bb648008a04401ca934081886bd))
* mutation test ([08cc9cb](https://github.com/pabloimrik17/monolab/commit/08cc9cb5428e1b01b45a4d164fa354e31b88f703))
* mutation test ([fbeb221](https://github.com/pabloimrik17/monolab/commit/fbeb221e0d5a872201e5dd11f5f62f1fa29b5980))
* **release:** explicitly target main branch for release PRs ([407aa42](https://github.com/pabloimrik17/monolab/commit/407aa42a549b78865c098972623c6a50262d10a0))
* updated README ([fcf0309](https://github.com/pabloimrik17/monolab/commit/fcf03092de75200c716da71a88da76d554002aff))
* use nx cloud based on env var ([#63](https://github.com/pabloimrik17/monolab/issues/63)) ([062bcbd](https://github.com/pabloimrik17/monolab/commit/062bcbd548ced805388becf9a61ad956d2e7eeab))


### Performance Improvements

* **ci:** optimize Codecov uploads for affected packages ([#64](https://github.com/pabloimrik17/monolab/issues/64)) ([d572488](https://github.com/pabloimrik17/monolab/commit/d572488853e778d476451197d0a14644973257e3))


### Documentation

* add mutation testing badge to README ([db3f21f](https://github.com/pabloimrik17/monolab/commit/db3f21f174c276e52c970a7716d1df509350889f))
* added codecov optimization proposal ([8bc0966](https://github.com/pabloimrik17/monolab/commit/8bc09661c51913140317d569d89a49eb1d901d87))
* added dual publish proposal ([9b5697b](https://github.com/pabloimrik17/monolab/commit/9b5697b02429959a845a5b49cec23abc94b39b14))
* **openspec:** archive add-markdownlint proposal ([dbe46fc](https://github.com/pabloimrik17/monolab/commit/dbe46fcf744f84ae3733c7e886c2f026e79ce4cf))
* update mutation testing tasks completion status ([2b89ee3](https://github.com/pabloimrik17/monolab/commit/2b89ee37ad0ad5830bc08fb1a6aaba33baac0b65))

## 1.0.0

### Features

-   Automated dual publishing to npm and JSR registries
-   Release automation using release-please
-   Per-package independent versioning
-   Monorepo-wide CI/CD workflows

### Infrastructure

-   GitHub Actions workflows for releases and publishing
-   OIDC authentication for npm Trusted Publishers
-   Conventional commits enforcement
