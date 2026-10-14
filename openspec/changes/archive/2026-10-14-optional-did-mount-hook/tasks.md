# Tasks

## 1. React mount contract

- [x] 1.1 [Public declarations; attw required] Declare optional `didMount` in `packages/react-clean/src/base.viewmodel.ts`, trim its JSDoc, and use awaited optional invocation in `src/use-view-model.hook.ts`; update hook JSDoc to say invocation is conditional. Verify the signatures and receiver-preserving call match design.md.
- [x] 1.2 Update `src/base.viewmodel.test.ts` to assert the hook is absent on a subclass without an implementation, retaining cleanup assertions. Add a missing-hook mount/unmount case to `src/use-view-model.hook.test.ts` that verifies a registered subscription is unsubscribed. Verify via `corepack pnpm nx run @m0n0lab/react-clean:test:unit` and retain implemented-hook, async, and rerender coverage.

## 2. Solid mount contract

- [x] 2.1 [Public declarations; attw required] Declare `didMount?(owner?: Owner): Promise<void> | void;` in `packages/solid-clean/src/base.viewmodel.ts` and invoke `vm.didMount?.(owner ?? undefined)` in `src/use-view-model.hook.ts`. Add a missing-hook case using existing Solid fixtures that verifies mount succeeds and registered cleanup runs on disposal; verify via `corepack pnpm nx run @m0n0lab/solid-clean:test:unit`.
- [x] 2.2 Reconcile `openspec/changes/qup/specs/solid-clean/spec.md`: make the base hook optional, qualify direct-call and mount scenarios for implemented hooks, and cover absence without losing cleanup. Verify all mount wording agrees with `specs/view-model-lifecycle/spec.md` and validate the edited Qup change with `openspec validate qup`.

## 3. Integration and compatibility

- [x] 3.1 Verify all 11 existing overrides retain `override` and no unguarded base-typed calls or `super.didMount()` calls remain in repository consumers. Run `corepack pnpm nx run @m0n0lab/react-clean:typecheck`, `corepack pnpm nx run @m0n0lab/solid-clean:typecheck`, and `corepack pnpm nx run @m0n0lab/qup-web:typecheck` to check consumer compatibility.
- [x] 3.2 Run `corepack pnpm nx run @m0n0lab/react-clean:test` and `corepack pnpm nx run @m0n0lab/solid-clean:test` for full package regression coverage, plus `corepack pnpm nx run @m0n0lab/react-clean:lint:eslint` and `corepack pnpm nx run @m0n0lab/react-clean:lint:oxfmt` for changed React files.
- [x] 3.3 [Public declarations; attw required] Run `corepack pnpm nx run @m0n0lab/react-clean:build:check-exports` and `corepack pnpm nx run @m0n0lab/solid-clean:build:check-exports`; these build and run `attw --pack`. Inspect emitted declarations for optional methods and built JavaScript for absence of the base no-op; verify package exports and dependency manifests are unchanged.
- [x] 3.4 Prepare the release-facing commit description with `feat!` or a `BREAKING CHANGE` footer documenting guarded base-typed calls and removal of direct `super.didMount()` calls. Verify English text, body lines at most 100 characters, and no issue IDs. Leave package versions and publication to the existing release workflow.
