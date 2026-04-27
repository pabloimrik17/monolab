## ADDED Requirements

### Requirement: Input contract

The skill SHALL accept a single input object with the following properties:

- `updates` (required): an array of update records each conforming to the existing `ScanResult.updates[]` shape produced by `experiments:scan-npm-updates`. Each record SHALL have at minimum `name`, `currentVersion`, `targetVersion`, `location`, and `sourceFile`.
- `maxPerGroup` (optional): integer override for the per-group cap (see the Per-group cap requirement). When omitted, the default cap applies.

The skill SHALL NOT mutate the `updates` array.

#### Scenario: Empty input returns empty groups

- **WHEN** the input `updates` is `[]`
- **THEN** the skill returns `{ groups: [], warnings: [] }`

#### Scenario: Input passthrough preserves order

- **WHEN** the caller passes an array containing 5 updates
- **THEN** the skill does not mutate the input array's contents or order

### Requirement: Deterministic ordering

The skill SHALL sort the input by package `name` ascending using a stable, locale-insensitive comparison before any partitioning. The same input array SHALL always produce the same group partition and the same group ids.

#### Scenario: Stable sort

- **WHEN** the input contains updates for `vitest`, `@tanstack/react-query`, `@tanstack/react-table`, `react`
- **THEN** the internal sort order before partitioning is `@tanstack/react-query`, `@tanstack/react-table`, `react`, `vitest` (scoped names sort by their full string including `@`)

#### Scenario: Reproducibility

- **WHEN** the same input is passed to the skill twice
- **THEN** both invocations return groups with the same ids, the same package assignments, and the same order of packages within each group

### Requirement: Scope-based coalescing

The skill SHALL coalesce all updates that share the same `@scope/` prefix into a single logical bucket prior to capping. Unscoped updates (names not starting with `@`) SHALL each form their own singleton bucket.

The bucket key for a scoped name `@scope/pkg` SHALL be `<scope>` (lowercased). The bucket key for an unscoped name `pkg` SHALL be `solo-<pkg>`.

#### Scenario: Scoped packages coalesce

- **WHEN** the input contains `@tanstack/react-query`, `@tanstack/react-table`, `@tanstack/query-core`
- **THEN** the three packages are placed in the same logical bucket keyed `tanstack`

#### Scenario: Different scopes do not coalesce

- **WHEN** the input contains `@tanstack/react-query` and `@radix-ui/react-dialog`
- **THEN** the two packages are placed in distinct buckets keyed `tanstack` and `radix-ui` respectively

#### Scenario: Unscoped packages are singletons

- **WHEN** the input contains `vitest` and `react`
- **THEN** `vitest` is placed in a bucket keyed `solo-vitest` and `react` in a bucket keyed `solo-react`

### Requirement: Per-group cap

The skill SHALL split any bucket whose package count exceeds `MAX_PER_GROUP` (default `8`) into chunks of size `MAX_PER_GROUP`, preserving the sort order. The final chunk SHALL contain the remainder. The skill SHALL accept an optional override of `MAX_PER_GROUP` via the caller's input parameter `maxPerGroup`; values outside the inclusive range `[1, 32]` SHALL cause the skill to abort with `Error: maxPerGroup must be between 1 and 32, got <value>.`

#### Scenario: Bucket under cap is not split

- **WHEN** a bucket has 5 packages and `MAX_PER_GROUP` is 8
- **THEN** the bucket produces exactly one group containing those 5 packages

#### Scenario: Bucket exceeding cap is split

- **WHEN** a bucket has 18 packages and `MAX_PER_GROUP` is 8
- **THEN** the bucket produces three groups containing 8, 8, and 2 packages in sort order

#### Scenario: Override accepted

- **WHEN** the caller passes `maxPerGroup: 4` and a bucket has 10 packages
- **THEN** the bucket produces three groups containing 4, 4, and 2 packages

#### Scenario: Out-of-range override aborts

- **WHEN** the caller passes `maxPerGroup: 0`
- **THEN** the skill aborts with `Error: maxPerGroup must be between 1 and 32, got 0.`

### Requirement: Group id generation

Each group SHALL receive a deterministic id of the form `<bucket-key>-<n>` where `<n>` is a 1-indexed sequence number within the bucket after splitting. The id SHALL be lowercase. Bucket keys SHALL be sanitized by replacing any run of `[^a-z0-9]+` with `-` and trimming leading and trailing `-`.

#### Scenario: Single-chunk scoped bucket

- **WHEN** the `tanstack` bucket has 3 packages and is not split
- **THEN** the resulting group has id `tanstack-1`

#### Scenario: Multi-chunk scoped bucket

- **WHEN** the `storybook` bucket has 18 packages and `MAX_PER_GROUP` is 8
- **THEN** the resulting group ids are `storybook-1`, `storybook-2`, `storybook-3`

#### Scenario: Unscoped singleton id

- **WHEN** the bucket key is `solo-react-router`
- **THEN** the resulting group id is `solo-react-router-1`

### Requirement: Output contract

The skill SHALL emit a single JSON object with this shape:

```ts
{
  groups: Array<{
    groupId: string;
    bucketKey: string;
    packages: Array<{
      name: string;
      currentVersion: string;
      targetVersion: string;
      location: string;
      sourceFile: string;
    }>;
  }>;
  warnings: string[];
}
```

The `groups` array SHALL be ordered by `groupId` ascending. The `packages` within each group SHALL preserve the post-sort order from the deterministic-ordering requirement. `warnings` SHALL be deduplicated.

#### Scenario: Output ordering

- **WHEN** the partition produces groups `tanstack-1`, `solo-react-1`, `vitest-1`
- **THEN** the output `groups` array is ordered `solo-react-1`, `tanstack-1`, `vitest-1` (ascending by id)

#### Scenario: Warning deduplication

- **WHEN** two distinct buckets each produce the warning `bucket key collision avoided via sanitization`
- **THEN** the output `warnings` array contains that string exactly once

#### Scenario: Raw JSON-only output

- **WHEN** the skill completes successfully
- **THEN** the only output is the raw JSON object (no Markdown fences, no surrounding prose)

### Requirement: Out-of-scope behaviors

The skill SHALL NOT perform any network operations (no `npm view`, no `gh api`, no fetch). The skill SHALL NOT read changelog content, package size, dependency graphs, or `repository.directory` metadata. Grouping decisions SHALL rely solely on the input array.

#### Scenario: No network calls

- **WHEN** the skill executes against an input of any size
- **THEN** the skill makes zero outbound network requests

#### Scenario: Determinism without external state

- **WHEN** the skill is invoked with the same input on two different machines with different network conditions
- **THEN** both invocations produce byte-identical output JSON
