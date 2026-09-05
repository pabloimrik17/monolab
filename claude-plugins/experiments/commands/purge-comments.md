---
description: Purge prose comment noise from the branch's changes, with an optional git ref or path scope
---

# purge-comments

Invoke the `purge-comment-noise` skill and let it do the work. It owns the policy, the scoping, the routing and the report.

**ARGUMENTS variable contains**: an optional git ref (`HEAD~3`, a tag, a branch name), or one or more paths.

- **Non-empty** — hand it to the skill verbatim as its scope override.
- **Empty** — invoke the skill with no override, so its default scope applies.

Reaching the skill this way is explicit invocation: it runs at any size. The autonomous trigger threshold governs only the case where nobody asked.
