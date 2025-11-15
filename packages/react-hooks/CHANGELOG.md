## 0.1.2 (2025-08-18)

### 🩹 Fixes

-   **@monolab/react-hooks:** added error handling ([001be77](https://github.com/pabloimrik17/monolab/commit/001be77))

### ❤️ Thank You

-   Pablo F. Guerra @pabloimrik17

## [1.1.3](https://github.com/pabloimrik17/monolab/compare/react-hooks-v1.1.2...react-hooks-v1.1.3) (2025-11-15)


### Bug Fixes

* remove --allow-dirty and --no-git-checks flags ([68c1518](https://github.com/pabloimrik17/monolab/commit/68c1518df82597b4a0ff3fbd5b75282878cde548))

## [1.1.2](https://github.com/pabloimrik17/monolab/compare/react-hooks-v1.1.1...react-hooks-v1.1.2) (2025-11-15)


### Bug Fixes

* remove --allow-dirty and --no-git-checks flags ([2dc0f39](https://github.com/pabloimrik17/monolab/commit/2dc0f394fb953d4442d70d455e3cc69381e0b374))


### Documentation

* add well documented badge to all packages ([46b624a](https://github.com/pabloimrik17/monolab/commit/46b624a9d68aa17f362320ace4095d86c2f84662))

## [1.1.1](https://github.com/pabloimrik17/monolab/compare/react-hooks-v1.1.0...react-hooks-v1.1.1) (2025-11-15)


### Documentation

* add production ready badge to all packages ([08ad79c](https://github.com/pabloimrik17/monolab/commit/08ad79c8936a069ec9daae40a314f496fecf0560))

## [1.1.0](https://github.com/pabloimrik17/monolab/compare/react-hooks-v1.0.3...react-hooks-v1.1.0) (2025-11-15)


### Features

* **@m0n0lab/ts-types:** renamed package and added StringKeyOf type([#90](https://github.com/pabloimrik17/monolab/issues/90)) ([1ecf78c](https://github.com/pabloimrik17/monolab/commit/1ecf78c502d133b99f1089983ea79b2d57f1522d))
* add types package ([#89](https://github.com/pabloimrik17/monolab/issues/89)) ([eee3cd6](https://github.com/pabloimrik17/monolab/commit/eee3cd6fb6e08fb0ffede5f99ba8012835961e42))
* migrate to Deno workspaces for JSR publishing ([3a987ac](https://github.com/pabloimrik17/monolab/commit/3a987acbd7dd66e58f08f430ff741a6ead2d3919))


### Bug Fixes

* stryker should not mutate test files ([4af7ad7](https://github.com/pabloimrik17/monolab/commit/4af7ad7c246fa47fe8183d8ee856003d1129e8e6))

## [1.0.3](https://github.com/pabloimrik17/monolab/compare/react-hooks-v1.0.2...react-hooks-v1.0.3) (2025-11-09)


### Documentation

* **react-hooks:** improve package description ([8e1cea6](https://github.com/pabloimrik17/monolab/commit/8e1cea6cd0936aeb4065528ce08b8f0a9d3ae2c6))

## [1.0.2](https://github.com/pabloimrik17/monolab/compare/react-hooks-v1.0.1...react-hooks-v1.0.2) (2025-11-09)


### Bug Fixes

* **packages:** add repository field to package.json files ([e4b8dde](https://github.com/pabloimrik17/monolab/commit/e4b8ddefc25eee5c4338bb61b2d6fa9423009b80))

## [1.0.1](https://github.com/pabloimrik17/monolab/compare/react-hooks-v1.0.0...react-hooks-v1.0.1) (2025-11-09)


### Documentation

* update READMEs with new [@m0n0lab](https://github.com/m0n0lab) scope and improve documentation ([8e3fb1e](https://github.com/pabloimrik17/monolab/commit/8e3fb1e670e601a40b79ef99c34a393c69fa7604))

## [1.0.0](https://github.com/pabloimrik17/monolab/compare/react-hooks-v0.3.1...react-hooks-v1.0.0) (2025-11-09)


### ⚠ BREAKING CHANGES

* All packages renamed from @monolab/* to @m0n0lab/*. Update imports and dependencies to use the new scope:
    - @monolab/is-even -> @m0n0lab/is-even
    - @monolab/is-odd -> @m0n0lab/is-odd
    - @monolab/react-clean -> @m0n0lab/react-clean
    - @monolab/react-hooks -> @m0n0lab/react-hooks
    - @monolab/ts-configs -> @m0n0lab/ts-configs

### Features

* change package scope from [@monolab](https://github.com/monolab) to [@m0n0lab](https://github.com/m0n0lab) ([bf07c95](https://github.com/pabloimrik17/monolab/commit/bf07c95eca39194c5aaca5dd08a5669ba21cb190))

## [0.3.1](https://github.com/pabloimrik17/monolab/compare/react-hooks-v0.3.0...react-hooks-v0.3.1) (2025-11-09)


### Bug Fixes

* trigger release-please to process pending releases ([14df820](https://github.com/pabloimrik17/monolab/commit/14df82060ff59932bb3ec28d094f3feffee96ac9))

## [0.3.0](https://github.com/pabloimrik17/monolab/compare/react-hooks-v0.2.0...react-hooks-v0.3.0) (2025-11-09)


### Features

* add mutation testing with Stryker ([40665e5](https://github.com/pabloimrik17/monolab/commit/40665e5c2fb3fb3b1c40c10e10bf4e1aa366e1be))
* **ci:** centralize prettier to fix CHANGELOG.md formatting issues ([d6635d6](https://github.com/pabloimrik17/monolab/commit/d6635d6ec79f4f81176f6ba9fab5eb7dd45a5086))
* implement mutation testing with Stryker ([9c758ed](https://github.com/pabloimrik17/monolab/commit/9c758ed1b4480808d03d81cc68d6dfdb10dda317))


### Bug Fixes

* **@monolab/react-hooks:** align tsconfig lib ([ee8795f](https://github.com/pabloimrik17/monolab/commit/ee8795f4221255678d71e6b715e6b6e7c3628c95))
* **@monolab/react-hooks:** align tsconfig lib ([8502bc9](https://github.com/pabloimrik17/monolab/commit/8502bc9fa11e8fb6f133631631a2055a99512846))
* **@monolab/react-hooks:** package version ([9a03186](https://github.com/pabloimrik17/monolab/commit/9a031867361eb1f9d9aa9abfdf1e43f4f7398ba9))
* **ci:** ignore CHANGELOG.md in per-package prettier checks ([26746a7](https://github.com/pabloimrik17/monolab/commit/26746a72f088c3ecdb5fe899f549f52359712143))
* codecov badge link ([#41](https://github.com/pabloimrik17/monolab/issues/41)) ([3fff18b](https://github.com/pabloimrik17/monolab/commit/3fff18bc04237399ac59cf0840417755a8fff47b))
* **deps:** pin dependencies ([#29](https://github.com/pabloimrik17/monolab/issues/29)) ([5b9e68d](https://github.com/pabloimrik17/monolab/commit/5b9e68d23a86a0cb4f89114ddac3adda0a6e2122))
* improve mutation testing with inPlace mode and enhanced test coverage ([3ff8594](https://github.com/pabloimrik17/monolab/commit/3ff85944f916594f923dadbe53a3fe5f7d8909d6))
* use nx cloud based on env var ([#63](https://github.com/pabloimrik17/monolab/issues/63)) ([062bcbd](https://github.com/pabloimrik17/monolab/commit/062bcbd548ced805388becf9a61ad956d2e7eeab))

## [0.2.0](https://github.com/pabloimrik17/monolab/compare/react-hooks-v0.1.2...react-hooks-v0.2.0) (2025-11-08)


### Features

* add mutation testing with Stryker ([40665e5](https://github.com/pabloimrik17/monolab/commit/40665e5c2fb3fb3b1c40c10e10bf4e1aa366e1be))
* implement mutation testing with Stryker ([9c758ed](https://github.com/pabloimrik17/monolab/commit/9c758ed1b4480808d03d81cc68d6dfdb10dda317))


### Bug Fixes

* **@monolab/react-hooks:** align tsconfig lib ([ee8795f](https://github.com/pabloimrik17/monolab/commit/ee8795f4221255678d71e6b715e6b6e7c3628c95))
* **@monolab/react-hooks:** align tsconfig lib ([8502bc9](https://github.com/pabloimrik17/monolab/commit/8502bc9fa11e8fb6f133631631a2055a99512846))
* **@monolab/react-hooks:** package version ([9a03186](https://github.com/pabloimrik17/monolab/commit/9a031867361eb1f9d9aa9abfdf1e43f4f7398ba9))
* codecov badge link ([#41](https://github.com/pabloimrik17/monolab/issues/41)) ([3fff18b](https://github.com/pabloimrik17/monolab/commit/3fff18bc04237399ac59cf0840417755a8fff47b))
* **deps:** pin dependencies ([#29](https://github.com/pabloimrik17/monolab/issues/29)) ([5b9e68d](https://github.com/pabloimrik17/monolab/commit/5b9e68d23a86a0cb4f89114ddac3adda0a6e2122))
* improve mutation testing with inPlace mode and enhanced test coverage ([3ff8594](https://github.com/pabloimrik17/monolab/commit/3ff85944f916594f923dadbe53a3fe5f7d8909d6))
* use nx cloud based on env var ([#63](https://github.com/pabloimrik17/monolab/issues/63)) ([062bcbd](https://github.com/pabloimrik17/monolab/commit/062bcbd548ced805388becf9a61ad956d2e7eeab))

## 0.1.1 (2025-08-18)

This was a version bump only for @monolab/react-hooks to align it with other projects, there were no code changes.
