## Why

Beads task `agentic-task-0fg5` requests an explicit decision on bundled fallow and varlock agent skills. Commit `79ce1c1` already grants both, and installation succeeds; the remaining work is to formalize the reviewed decision and its acceptance criteria in the existing install-hardening specification.

## What Changes

- Retain `permissions.fallow.skills: true` and `permissions.varlock.skills: true` following review of fallow 3.31.0 and varlock 1.21.0.
- Add install-hardening requirements for these explicit skill grants, preserving independent build restrictions.
- Verify the actual pnpm install and permissions output; record evidence in shared Beads.
- Treat an already-correct YAML as a successful no-op, without manufacturing configuration changes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `pnpm-install-hardening`: Specify the two reviewed skill grants and installation without pending skill approvals.

## Impact

Scope: root `pnpm-workspace.yaml`, the existing install-hardening specification, and shared Beads task notes. No new packages, dependency upgrades, peer dependency changes, exports, application behavior, or build grants. Existing parallel work remains untouched. Planning artifacts only in this workflow; implementation requires a subsequent apply request.
