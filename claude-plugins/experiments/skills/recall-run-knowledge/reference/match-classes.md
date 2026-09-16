# Match classes

The classification contract of the run knowledge base. `match-knowledge.mjs` implements it; `recall-run-knowledge` invokes the script and never re-derives a class in prose. This file is the single definition: `parallel-research-workflow`, `npm-update-deep-orchestrator`, `commander-update-orchestrator` and `/experiments:knowledge-recall` cite it instead of carrying a copy.

A **candidate** is one persisted range section of a package hub — one `## <from> → <to>` block, sourced from one run note. A **scanned package** is one entry of a group's `packages[]`, carrying `name`, `from` (`cur.from`) and `to` (`cur.to`). `prior.from` / `prior.to` are the candidate's range bounds.

## The four classes

| Class     | Condition                                                                                | What it injects                                                                                                                                                                                                                                                                                                                                                                                |
| --------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `exact`   | same `name`, `prior.from == cur.from && prior.to == cur.to`                              | A copy directive. The research subagent fetches the changelog, does not research the package, and copies the hub's `### Universal` section into `research.md` under `## <pkg> (<from> → <to>)`, first line `source: prior-run <runId>`. In `single-project` mode it then writes the `(this project)` sections by checking each copied finding against the current codebase. `delta` is `null`. |
| `overlap` | same `name`, the ranges intersect and are not equal                                      | The prior section as context plus a narrowed research scope: fresh research is restricted to `delta`, and the subagent reads the hub section `<anchor>` first and does not repeat its findings.                                                                                                                                                                                                |
| `prior`   | same `name`, `prior.to <= cur.from`                                                      | Applicability only — the hub's `### Applied` section under `<anchor>`, for how earlier projects handled the package. Its findings do not carry over and are never injected. `delta` is `null`.                                                                                                                                                                                                 |
| `related` | no same-name hit for this package, and another package in the same `bucketKey` has a hub | Context paths only — the sibling hub paths. Emitted in `related[]`, never in `hits[]`.                                                                                                                                                                                                                                                                                                         |

Version comparison is `lib/semver.mjs`. Ranges are compared on the resolved versions, not on the range operators (`^5.90.18` compares as `5.90.18`).

## `delta`

`delta` is the part of the current range the prior run never covered — the sub-range or sub-ranges of `(cur.from, cur.to]` not covered by `(prior.from, prior.to]`, written in interval notation with the same version strings the scan carries.

- Base holds `23.0.2 → 23.1.0`, the scan bumps `23.0.5 → 23.3.0` → `delta` is `(23.1.0, 23.3.0]`.
- Two disjoint uncovered sub-ranges are joined by a comma and a space, in ascending order.
- A current range the prior range covers entirely leaves nothing to research: `delta` is `null`, and the directive is to read the prior section and research nothing beyond it.
- Every class other than `overlap` carries `delta: null`.

`delta` is what the `OVERLAP` directive line names as the research scope, so its text reaches a subagent verbatim — it stays a range, never a sentence.

## Exclusions

A candidate whose run note is tagged `synthetic`, or whose run note carries `status: draft`, is never a candidate in any class. The exclusion is total:

- It yields no `exact`, `overlap` or `prior` hit, even when its range matches perfectly and it is the only candidate the base holds.
- It cannot back a `related` entry either: a hub whose sections all come from excluded notes is not a sibling hub for bucket purposes.

`synthetic` marks seeded or dry-run material that was never a real applied run. `status: draft` marks a note whose summary failed `check-knowledge-note.mjs` validation, so its prose is unverified. Neither is fit to steer research, and because the matcher drops them at the source, neither can reach a dispatch prompt or the dossier's `## Prior runs` section.

## One hit per package, and the preference order

A scanned package receives **at most one** same-name hit. When several candidates survive the exclusions, they are ranked:

1. By class: `exact` before `overlap` before `prior`.
2. Between candidates of the same class: the newest `createdAt` wins.

`related` is not part of that ranking — it is the fallback for a package that ended with no same-name hit at all. A package therefore appears in `hits[]` or in `related[]`, never in both.

## Staleness is a function of versions only

The base never ages out. A candidate is stale only when the versions say so — that is what `prior` means, and what `delta` carves out of an `overlap`.

`createdAt` does one job: it breaks a tie between candidates of the same class. It filters nothing, downgrades no class, and outranks no class: the oldest note in the base still yields an `exact` hit when its range is identical, and an `exact` from two years ago still beats a `prior` from last week.

Matching holds no time window, no TTL and no expiry. Pruning the base is a manual, human decision.
