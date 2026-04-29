---
name: group-packages-for-research
description: Use when a command needs to partition a `ScanResult.updates[]` array (from `experiments:scan-npm-updates`) into deterministic, bounded subagent groups before dispatching parallel research — for example `/experiments:npm-update-deep-patch` (and future deep-* siblings) before invoking `parallel-research-workflow`. Trigger phrases include "group these updates", "partition this scan result", or any flow handing a `ScanResult` to a fan-out workflow. Pure: same input → same output, no network, no filesystem reads. Returns `{ groups: [{ groupId, bucketKey, packages }], warnings }` JSON.
---

# group-packages-for-research

Partition a list of `ScanResult.updates[]` into deterministic, bounded groups suitable for one-subagent-per-group parallel research. The grouping is reproducible, monorepo-aware (via the `@scope/` heuristic), and capped per group so any single subagent's context stays bounded.

This skill is **the** grouping primitive consumed by `parallel-research-workflow` (and therefore by `/experiments:npm-update-deep-patch`). It is pure: same input → same output, no network, no filesystem reads.

## Inputs

- **`updates`** (required): an array of update records conforming to the existing `ScanResult.updates[]` shape produced by `experiments:scan-npm-updates`. Each record SHALL have at minimum `name`, `currentVersion`, `targetVersion`, `location`, and `sourceFile`.
- **`maxPerGroup`** (optional, integer, default `8`): override for the per-group cap. Inclusive valid range `[1, 32]`. A value outside this range aborts with:

    ```text
    Error: maxPerGroup must be between 1 and 32, got <value>.
    ```

The skill SHALL NOT mutate the input array.

## Output contract

Emit a single JSON object — raw, no Markdown fences, no surrounding prose:

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

- `groups` ordered by `groupId` ascending (locale-insensitive string compare).
- `packages` within each group preserve the post-sort order from the deterministic-ordering step below.
- `warnings` deduplicated (same string appearing twice → keep one).

Empty input → `{ "groups": [], "warnings": [] }`.

## Algorithm

### Step 1 — Validate `maxPerGroup`

If the caller provided `maxPerGroup` and it is not an integer in `[1, 32]`, abort with the message above. Otherwise, the effective cap is `MAX_PER_GROUP = maxPerGroup ?? 8`.

### Step 2 — Deterministic sort

Sort the input by package `name` ascending using a stable, locale-insensitive comparison (e.g. `Array.prototype.sort` with `(a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0`). Scoped names sort by their full string including the leading `@`, so `@tanstack/react-query` precedes `react`.

The same input array SHALL always produce the same group partition and the same group ids — no reliance on map/dict iteration order, no clock, no randomness.

### Step 3 — Bucketing

Walk the sorted list once and place each record into a bucket keyed by:

- For a scoped name `@scope/pkg` → bucket key = `<scope>` (lowercased).
- For an unscoped name `pkg` → bucket key = `solo-<pkg>` (lowercased, no other transformation at this stage).

All updates that share a scope coalesce into the same bucket. Unscoped updates are singletons by construction.

### Step 4 — Cap and chunk

For each bucket whose package count exceeds `MAX_PER_GROUP`, split it into chunks of size `MAX_PER_GROUP` preserving sort order. The final chunk contains the remainder. Buckets at or below the cap stay as a single chunk.

### Step 5 — Group id generation

For each chunk, compute the `groupId` as `<sanitized-bucket-key>-<n>` where:

- `n` is `1`-indexed within the bucket after splitting.
- Sanitization of the bucket key: lowercase, replace any run matching `[^a-z0-9]+` with `-`, then trim leading and trailing `-`.

Examples:

| Bucket key          | Sanitized           | n=1 group id          |
| ------------------- | ------------------- | --------------------- |
| `tanstack`          | `tanstack`          | `tanstack-1`          |
| `radix-ui`          | `radix-ui`          | `radix-ui-1`          |
| `solo-react-router` | `solo-react-router` | `solo-react-router-1` |
| `solo-vitest`       | `solo-vitest`       | `solo-vitest-1`       |

If sanitization collapses two distinct bucket keys to the same id (rare; e.g., `radix.ui` and `radix-ui`), the second one SHALL receive a numeric suffix increment AND the skill SHALL append `bucket key collision avoided via sanitization` to `warnings` (deduplicated).

### Step 6 — Emit JSON

Build the output with groups sorted by `groupId` ascending, packages within each group preserving the Step-2 sort order, warnings deduplicated. Print the raw JSON object as the only output.

## Out-of-scope behaviors

The skill SHALL NOT:

- Make any network call (`npm view`, `gh api`, fetch, etc.).
- Read changelogs, package size, dependency graphs, or `repository.directory` metadata.
- Read or write any file on disk.
- Vary its output based on environment, locale, or wall-clock time.

Grouping decisions rely solely on the input array. This guarantees that the same input on two different machines with different network conditions produces byte-identical output.

## Worked example

**Input** (passed by `/experiments:npm-update-deep-patch` after a scan):

```json
[
    {
        "name": "@tanstack/react-query",
        "currentVersion": "^5.90.18",
        "targetVersion": "^5.90.20",
        "location": "workspace:@m0n0lab/wealth-react",
        "sourceFile": "apps/wealth-react/package.json"
    },
    {
        "name": "@tanstack/react-table",
        "currentVersion": "^8.20.0",
        "targetVersion": "^8.20.5",
        "location": "workspace:@m0n0lab/wealth-react",
        "sourceFile": "apps/wealth-react/package.json"
    },
    {
        "name": "vitest",
        "currentVersion": "4.0.18",
        "targetVersion": "4.0.24",
        "location": "catalog:default",
        "sourceFile": "pnpm-workspace.yaml"
    },
    {
        "name": "react",
        "currentVersion": "^19.0.0",
        "targetVersion": "^19.0.14",
        "location": "workspace:@m0n0lab/wealth-react",
        "sourceFile": "apps/wealth-react/package.json"
    }
]
```

**After Step 2 (deterministic sort)**:

`@tanstack/react-query`, `@tanstack/react-table`, `react`, `vitest`

**After Step 3 (bucketing)**:

```text
tanstack    → [@tanstack/react-query, @tanstack/react-table]
solo-react  → [react]
solo-vitest → [vitest]
```

**After Step 4 (cap)**: no bucket exceeds 8, no chunking.

**After Step 5 (group ids)**:

- `tanstack-1`
- `solo-react-1`
- `solo-vitest-1`

**Output**:

```json
{
    "groups": [
        {
            "groupId": "solo-react-1",
            "bucketKey": "solo-react",
            "packages": [
                {
                    "name": "react",
                    "currentVersion": "^19.0.0",
                    "targetVersion": "^19.0.14",
                    "location": "workspace:@m0n0lab/wealth-react",
                    "sourceFile": "apps/wealth-react/package.json"
                }
            ]
        },
        {
            "groupId": "solo-vitest-1",
            "bucketKey": "solo-vitest",
            "packages": [
                {
                    "name": "vitest",
                    "currentVersion": "4.0.18",
                    "targetVersion": "4.0.24",
                    "location": "catalog:default",
                    "sourceFile": "pnpm-workspace.yaml"
                }
            ]
        },
        {
            "groupId": "tanstack-1",
            "bucketKey": "tanstack",
            "packages": [
                {
                    "name": "@tanstack/react-query",
                    "currentVersion": "^5.90.18",
                    "targetVersion": "^5.90.20",
                    "location": "workspace:@m0n0lab/wealth-react",
                    "sourceFile": "apps/wealth-react/package.json"
                },
                {
                    "name": "@tanstack/react-table",
                    "currentVersion": "^8.20.0",
                    "targetVersion": "^8.20.5",
                    "location": "workspace:@m0n0lab/wealth-react",
                    "sourceFile": "apps/wealth-react/package.json"
                }
            ]
        }
    ],
    "warnings": []
}
```

Note that the output `groups` array is sorted ascending by `groupId` (`solo-react-1`, `solo-vitest-1`, `tanstack-1`), independent of the order the buckets were filled in.

## See also

- `parallel-research-workflow` — the consumer of this skill's output. Dispatches one subagent per group.
- `/experiments:npm-update-deep-patch` — the first command in the deep-update family that wires `scan-npm-updates` → this skill → `parallel-research-workflow`.
- `experiments:scan-npm-updates` — produces the `ScanResult.updates[]` consumed here.
