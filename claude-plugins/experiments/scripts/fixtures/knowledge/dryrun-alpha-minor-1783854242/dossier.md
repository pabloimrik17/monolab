# Deep-minor dossier: dryrun-alpha

## Improvements (applicable to this codebase)

- [medium] zod — the `zod/v4` subpath now ships inside the `zod` package (since 3.25.0); the single `ConfigSchema` uses only APIs that carry over, so switching its `require("zod")` to `require("zod/v4")` is a low-risk opportunity for faster parsing / smaller footprint. Areas: src/index.js. (group: solo-zod-1)
- [low] zod — new string-format validators `.jwt()`, `.base64url()`, `.cidr()` (3.24.0) are available for future token, base64url-payload, or IP-range fields on config schemas. Areas: src/**/*.js. (group: solo-zod-1)
- [low] semver — transparent compare fast-paths (7.7.3, "faster paths for compare") speed up the existing `semver.gte` node-version guard with no code change. Areas: src/index.js. (group: solo-semver-1)
- [low] semver — an internal cache replaced the `lru-cache` dependency (7.6.1 / 7.6.2), shrinking the project's installed transitive dependency footprint; realized simply by taking the bump. Areas: package.json. (group: solo-semver-1)
- [low] lodash — 4.18.0 security hardening (prototype pollution in `_.unset`/`_.omit`, code injection via `_.template` `imports` keys) is delivered passively by the bump; none of the affected APIs are used today. Areas: src/**/*.js. (group: solo-lodash-1)

## Workarounds resolved

_no workarounds resolved_

## Skipped or unavailable

_no skipped groups_

## Minor bump set

| package | current → target   | location |
| ------- | ------------------ | -------- |
| chalk   | ^4.1.0 → ^4.1.2    | root     |
| lodash  | ^4.17.19 → ^4.18.1 | root     |
| semver  | ^7.5.4 → ^7.8.5    | root     |
| zod     | ^3.23.8 → ^3.25.76 | root     |

## Changelogs

### chalk (4.1.0 → 4.1.2)

Sources: [repository](https://github.com/chalk/chalk) · [4.1.1](https://github.com/chalk/chalk/releases/tag/v4.1.1) · [4.1.2](https://github.com/chalk/chalk/releases/tag/v4.1.2)

<details>
<summary>4.1.1</summary>

- Readme updates https://github.com/chalk/chalk/commit/89e9e3a5b0601f4eda4c3a92acd887ec836d0175

</details>

<details>
<summary>4.1.2</summary>

- Readme updates

</details>

### lodash (4.17.19 → 4.18.1)

Sources: [repository](https://github.com/lodash/lodash) · [4.18.0](https://github.com/lodash/lodash/releases/tag/4.18.0) · [4.18.1](https://github.com/lodash/lodash/releases/tag/4.18.1)

_fixture: changelog body truncated_

### semver (7.5.4 → 7.8.5)

Sources: [repository](https://github.com/npm/node-semver) · [7.6.0](https://raw.githubusercontent.com/npm/node-semver/main/CHANGELOG.md) · [7.6.1](https://raw.githubusercontent.com/npm/node-semver/main/CHANGELOG.md) · [7.6.2](https://raw.githubusercontent.com/npm/node-semver/main/CHANGELOG.md) · [7.6.3](https://raw.githubusercontent.com/npm/node-semver/main/CHANGELOG.md) · [7.7.0](https://raw.githubusercontent.com/npm/node-semver/main/CHANGELOG.md) · [7.7.1](https://raw.githubusercontent.com/npm/node-semver/main/CHANGELOG.md) · [7.7.2](https://raw.githubusercontent.com/npm/node-semver/main/CHANGELOG.md) · [7.7.3](https://raw.githubusercontent.com/npm/node-semver/main/CHANGELOG.md) · [7.7.4](https://raw.githubusercontent.com/npm/node-semver/main/CHANGELOG.md) · [7.8.0](https://raw.githubusercontent.com/npm/node-semver/main/CHANGELOG.md) · [7.8.1](https://raw.githubusercontent.com/npm/node-semver/main/CHANGELOG.md) · [7.8.2](https://raw.githubusercontent.com/npm/node-semver/main/CHANGELOG.md) · [7.8.3](https://raw.githubusercontent.com/npm/node-semver/main/CHANGELOG.md) · [7.8.4](https://raw.githubusercontent.com/npm/node-semver/main/CHANGELOG.md) · [7.8.5](https://raw.githubusercontent.com/npm/node-semver/main/CHANGELOG.md)

_fixture: changelog body truncated_

### zod (3.23.8 → 3.25.76)

Sources: [repository](https://github.com/colinhacks/zod) · [3.24.0](https://github.com/colinhacks/zod/releases/tag/v3.24.0) · [3.24.1](https://github.com/colinhacks/zod/releases/tag/v3.24.1) · [3.24.2](https://github.com/colinhacks/zod/releases/tag/v3.24.2) · [3.24.3](https://github.com/colinhacks/zod/releases/tag/v3.24.3) · [3.24.4](https://github.com/colinhacks/zod/releases/tag/v3.24.4) · [3.25.9](https://github.com/colinhacks/zod/releases/tag/v3.25.9) · [3.25.10](https://github.com/colinhacks/zod/releases/tag/v3.25.10) · [3.25.11](https://github.com/colinhacks/zod/releases/tag/v3.25.11) · [3.25.12](https://github.com/colinhacks/zod/releases/tag/v3.25.12) · [3.25.13](https://github.com/colinhacks/zod/releases/tag/v3.25.13) · [3.25.14](https://github.com/colinhacks/zod/releases/tag/v3.25.14) · [3.25.15](https://github.com/colinhacks/zod/releases/tag/v3.25.15) · [3.25.16](https://github.com/colinhacks/zod/releases/tag/v3.25.16) · [3.25.17](https://github.com/colinhacks/zod/releases/tag/v3.25.17) · [3.25.18](https://github.com/colinhacks/zod/releases/tag/v3.25.18) · [3.25.20](https://github.com/colinhacks/zod/releases/tag/v3.25.20) · [3.25.21](https://github.com/colinhacks/zod/releases/tag/v3.25.21) · [3.25.22](https://github.com/colinhacks/zod/releases/tag/v3.25.22) · [3.25.23](https://github.com/colinhacks/zod/releases/tag/v3.25.23) · [3.25.24](https://github.com/colinhacks/zod/releases/tag/v3.25.24) · [3.25.25](https://github.com/colinhacks/zod/releases/tag/v3.25.25) · [3.25.26](https://github.com/colinhacks/zod/releases/tag/v3.25.26) · [3.25.27](https://github.com/colinhacks/zod/releases/tag/v3.25.27) · [3.25.28](https://github.com/colinhacks/zod/releases/tag/v3.25.28) · [3.25.29](https://github.com/colinhacks/zod/releases/tag/v3.25.29) · [3.25.30](https://github.com/colinhacks/zod/releases/tag/v3.25.30) · [3.25.31](https://github.com/colinhacks/zod/releases/tag/v3.25.31) · [3.25.32](https://github.com/colinhacks/zod/releases/tag/v3.25.32) · [3.25.33](https://github.com/colinhacks/zod/releases/tag/v3.25.33) · [3.25.34](https://github.com/colinhacks/zod/releases/tag/v3.25.34) · [3.25.35](https://github.com/colinhacks/zod/releases/tag/v3.25.35) · [3.25.36](https://github.com/colinhacks/zod/releases/tag/v3.25.36) · [3.25.37](https://github.com/colinhacks/zod/releases/tag/v3.25.37) · [3.25.38](https://github.com/colinhacks/zod/releases/tag/v3.25.38) · [3.25.39](https://github.com/colinhacks/zod/releases/tag/v3.25.39) · [3.25.40](https://github.com/colinhacks/zod/releases/tag/v3.25.40) · [3.25.41](https://github.com/colinhacks/zod/releases/tag/v3.25.41) · [3.25.42](https://github.com/colinhacks/zod/releases/tag/v3.25.42) · [3.25.43](https://github.com/colinhacks/zod/releases/tag/v3.25.43) · [3.25.44](https://github.com/colinhacks/zod/releases/tag/v3.25.44) · [3.25.45](https://github.com/colinhacks/zod/releases/tag/v3.25.45) · [3.25.46](https://github.com/colinhacks/zod/releases/tag/v3.25.46) · [3.25.47](https://github.com/colinhacks/zod/releases/tag/v3.25.47) · [3.25.48](https://github.com/colinhacks/zod/releases/tag/v3.25.48) · [3.25.49](https://github.com/colinhacks/zod/releases/tag/v3.25.49) · [3.25.50](https://github.com/colinhacks/zod/releases/tag/v3.25.50) · [3.25.51](https://github.com/colinhacks/zod/releases/tag/v3.25.51) · [3.25.52](https://github.com/colinhacks/zod/releases/tag/v3.25.52) · [3.25.53](https://github.com/colinhacks/zod/releases/tag/v3.25.53) · [3.25.54](https://github.com/colinhacks/zod/releases/tag/v3.25.54) · [3.25.55](https://github.com/colinhacks/zod/releases/tag/v3.25.55) · [3.25.56](https://github.com/colinhacks/zod/releases/tag/v3.25.56) · [3.25.57](https://github.com/colinhacks/zod/releases/tag/v3.25.57) · [3.25.58](https://github.com/colinhacks/zod/releases/tag/v3.25.58) · [3.25.59](https://github.com/colinhacks/zod/releases/tag/v3.25.59) · [3.25.60](https://github.com/colinhacks/zod/releases/tag/v3.25.60) · [3.25.61](https://github.com/colinhacks/zod/releases/tag/v3.25.61) · [3.25.62](https://github.com/colinhacks/zod/releases/tag/v3.25.62) · [3.25.63](https://github.com/colinhacks/zod/releases/tag/v3.25.63) · [3.25.64](https://github.com/colinhacks/zod/releases/tag/v3.25.64) · [3.25.65](https://github.com/colinhacks/zod/releases/tag/v3.25.65) · [3.25.66](https://github.com/colinhacks/zod/releases/tag/v3.25.66) · [3.25.67](https://github.com/colinhacks/zod/releases/tag/v3.25.67) · [3.25.68](https://github.com/colinhacks/zod/releases/tag/v3.25.68) · [3.25.69](https://github.com/colinhacks/zod/releases/tag/v3.25.69) · [3.25.70](https://github.com/colinhacks/zod/releases/tag/v3.25.70) · [3.25.71](https://github.com/colinhacks/zod/releases/tag/v3.25.71) · [3.25.72](https://github.com/colinhacks/zod/releases/tag/v3.25.72) · [3.25.73](https://github.com/colinhacks/zod/releases/tag/v3.25.73) · [3.25.74](https://github.com/colinhacks/zod/releases/tag/v3.25.74) · [3.25.75](https://github.com/colinhacks/zod/releases/tag/v3.25.75) · [3.25.76](https://github.com/colinhacks/zod/releases/tag/v3.25.76)

_fixture: changelog body truncated_
