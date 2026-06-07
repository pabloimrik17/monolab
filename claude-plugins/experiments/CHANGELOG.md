# Changelog

## [1.2.0](https://github.com/pabloimrik17/monolab/compare/experiments--v1.1.0...experiments--v1.2.0) (2026-06-07)


### Features

* **experiments:** minor update cascade + shared apply-npm-updates skill ([202f188](https://github.com/pabloimrik17/monolab/commit/202f1881710c216cd2aaca61be196827f80ccc1a))
* **experiments:** minor update cascade + shared apply-npm-updates skill ([cb6ffbd](https://github.com/pabloimrik17/monolab/commit/cb6ffbdca97dc9c6e353fdf8b8cfd42491353c87))


### Documentation

* **experiments:** apply CodeRabbit review fixes (PR [#229](https://github.com/pabloimrik17/monolab/issues/229)) ([12807f1](https://github.com/pabloimrik17/monolab/commit/12807f14f49679bc30c9bc3a820ecf80a862b0ae))

## [1.1.0](https://github.com/pabloimrik17/monolab/compare/experiments--v1.0.0...experiments--v1.1.0) (2026-05-24)


### Features

* **commander:** graduate commander to its own plugin ([#221](https://github.com/pabloimrik17/monolab/issues/221)) ([fad82da](https://github.com/pabloimrik17/monolab/commit/fad82da0c866bf9fbaf355c433e1c9035eaaf6d8))

## [1.0.0](https://github.com/pabloimrik17/monolab/compare/experiments--v0.8.0...experiments--v1.0.0) (2026-05-17)


### ⚠ BREAKING CHANGES

* **plugins:** experiments:plugin-version-bump skill removed. Plugin bumps now driven by conventional commits via release-please.

### Features

* added new experiments plugin ([#124](https://github.com/pabloimrik17/monolab/issues/124)) ([2164e85](https://github.com/pabloimrik17/monolab/commit/2164e85b2c3449ed9a06af710d89df15c7da535f))
* added ralph loop scaffolding ([#127](https://github.com/pabloimrik17/monolab/issues/127)) ([674a329](https://github.com/pabloimrik17/monolab/commit/674a329545ce705086cf46444ff8747db76015e4))
* **experiments:** /experiments:commander-update command (MON-131) ([#205](https://github.com/pabloimrik17/monolab/issues/205)) ([c8aad20](https://github.com/pabloimrik17/monolab/commit/c8aad20475c04ed04f71ffb8151a8b7ca56dad64))
* **experiments:** /experiments:commander-update-deep-patch command (MON-199) ([#206](https://github.com/pabloimrik17/monolab/issues/206)) ([09f0249](https://github.com/pabloimrik17/monolab/commit/09f0249c0aff742a4547ae9c4de09a3f8c4a3f49))
* **experiments:** /experiments:commander-update-patch command (MON-194) ([#202](https://github.com/pabloimrik17/monolab/issues/202)) ([54de303](https://github.com/pabloimrik17/monolab/commit/54de3039d372bb9a81a660d023d9d6b6bd47301b))
* **experiments:** /experiments:npm-update-deep-patch command (MON-145) ([#200](https://github.com/pabloimrik17/monolab/issues/200)) ([2cce62f](https://github.com/pabloimrik17/monolab/commit/2cce62f482633eed7bf839f6121e8c9153c162fe))
* **experiments:** add /experiments:commander-list (MON-132) ([#198](https://github.com/pabloimrik17/monolab/issues/198)) ([c156bfd](https://github.com/pabloimrik17/monolab/commit/c156bfdf5c3886f295f04b94e08d55bc645d09f7))
* **experiments:** add hookify skill ([#156](https://github.com/pabloimrik17/monolab/issues/156)) ([84c4466](https://github.com/pabloimrik17/monolab/commit/84c44665ca22afab8f6e8a731b57c143cdc1b7f8))
* **experiments:** add plugin-version-bump skill ([#159](https://github.com/pabloimrik17/monolab/issues/159)) ([ceb5936](https://github.com/pabloimrik17/monolab/commit/ceb59369c4450c79e7bb2dc88c70eb313508007b))
* **experiments:** add skill-terraformer skill ([#157](https://github.com/pabloimrik17/monolab/issues/157)) ([9a0e854](https://github.com/pabloimrik17/monolab/commit/9a0e854325ece18a68b9bf210300b6953d3706c0))
* **experiments:** add skills-update-check skill ([#158](https://github.com/pabloimrik17/monolab/issues/158)) ([c417583](https://github.com/pabloimrik17/monolab/commit/c417583894f7713c83f889f45ac5b171c0f84869))
* **experiments:** bump plugin version ([e1f143e](https://github.com/pabloimrik17/monolab/commit/e1f143e2d572f1f1dff4ecda7b7fe752b06f6f6f))
* **experiments:** commander-delete command (MON-130) ([#199](https://github.com/pabloimrik17/monolab/issues/199)) ([5f7ca29](https://github.com/pabloimrik17/monolab/commit/5f7ca29dabf74b1a7944ebb945ea6b2b5c9aa790))
* **experiments:** commander-normalize skill + registry v2 ([#193](https://github.com/pabloimrik17/monolab/issues/193)) ([d14a97f](https://github.com/pabloimrik17/monolab/commit/d14a97fac5b291ecd6fcf0208587463d6a31fcf1))
* **experiments:** delegate npm-update-patch apply to ncu + override registry ([#195](https://github.com/pabloimrik17/monolab/issues/195)) ([d5e186a](https://github.com/pabloimrik17/monolab/commit/d5e186af24fa866908aa047a760e1f189727490c))
* **experiments:** monorepo-aware npm-changelog + tagFormat cache ([#192](https://github.com/pabloimrik17/monolab/issues/192)) ([d923494](https://github.com/pabloimrik17/monolab/commit/d92349440836269d630c8ef384c04ec22b80fe21))
* **experiments:** npm-changelog skill ([#165](https://github.com/pabloimrik17/monolab/issues/165)) ([5ef82f8](https://github.com/pabloimrik17/monolab/commit/5ef82f87b5960e2d1a0f904fea021bd5cd63d071))
* **plugins:** adopt claude-plugin-tag release flow ([#197](https://github.com/pabloimrik17/monolab/issues/197)) ([3ea84bd](https://github.com/pabloimrik17/monolab/commit/3ea84bd010330b4f6d42517638f58045cc8c155e))
* **skills:** propose npm-update-patch command and shared scan skill ([#186](https://github.com/pabloimrik17/monolab/issues/186)) ([a5bec80](https://github.com/pabloimrik17/monolab/commit/a5bec808e96975bb945f92d5a5609b87fc20a476))


### Bug Fixes

* **experiments:** improve skill descriptions for trigger activation ([93d7a51](https://github.com/pabloimrik17/monolab/commit/93d7a515b23b4dab136755c4d8bcf5c5db167cd7))
* **experiments:** ralph outputs to current dir, not subdirectory ([#129](https://github.com/pabloimrik17/monolab/issues/129)) ([2b68111](https://github.com/pabloimrik17/monolab/commit/2b68111e009d0c5c503201fe6f73a017f1f99c77)), closes [#128](https://github.com/pabloimrik17/monolab/issues/128)
* trigger release-please to process pending releases ([14df820](https://github.com/pabloimrik17/monolab/commit/14df82060ff59932bb3ec28d094f3feffee96ac9))


### Documentation

* **openspec:** add commander-add command change proposal ([#188](https://github.com/pabloimrik17/monolab/issues/188)) ([c28d8fa](https://github.com/pabloimrik17/monolab/commit/c28d8fa39f19cc6478e597dbbc2ebca7fcad0bf3))
* **openspec:** archive npm-changelog-skill, sync specs, fix step cross-refs ([0fcbf89](https://github.com/pabloimrik17/monolab/commit/0fcbf89986ebb3976d006ac7db78ccc37686d250))
