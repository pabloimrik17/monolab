## zod (3.23.8 → 3.25.76)

Codebase usage is a single consumer: `src/index.js` imports `{ z }` via CommonJS `require("zod")` and defines one schema (`ConfigSchema = z.object({ name: z.string(), retries: z.number().int().min(0).default(3) })`) parsed with `.parse()`. This is a small pnpm dry-run fixture; the API surface touched is tiny and fully v3-compatible.

### Workarounds resolved

_no findings_

### Improvements applicable

- **`zod/v4` subpath now ships inside the `zod` package (introduced in 3.25.0).** The whole 3.25.x line bundles the Zod 4 rewrite under `zod/v4` (and a tree-shakeable `zod/v4-mini`) while `zod` stays on v3. The single schema in `src/index.js` uses only APIs that carry over (`z.object`, `z.string`, `z.number().int().min().default()`, `.parse()`), so switching that one `require("zod")` to `require("zod/v4")` is a low-risk opportunity for faster parsing / smaller footprint. Opportunity only — not required by the bump. Dir hint: `src/index.js`.
- **New string-format validators from 3.24.0: `.jwt()`, `.base64url()`, `.cidr()`.** Not consumed today. Relevant only if `ConfigSchema` (or future schemas under `src/**/*.js`) grows to validate tokens, base64url payloads, or IP ranges — would replace hand-rolled regex/checks if any were added. Symbols: `z.string().jwt`, `z.string().base64url`, `z.string().cidr`.
- **Standard Schema spec (`~standard`) implemented in 3.24.0.** Lets the schema be passed directly to ecosystem/framework tooling (form libs, validators) without a zod-specific adapter. No current consumer in this repo; applicable if the config schema is later handed to a Standard-Schema-aware integration.
- **Relevant bug fixes in range (3.24.0): bigint `coerce` crash fix and ipv6 regex correctness.** Not exercised by the current `z.string()` / `z.number()` usage; noted for completeness in case coercion or IP validation is introduced.

_Note: 8 versions (3.25.0–3.25.8) had no fetchable changelog source (see changelogs/zod/error.txt); the Zod-4-under-`zod/v4` change from that window is captured above via the 3.25.9 aggregate release notes._
