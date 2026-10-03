# Tasks

## 1. Plugin scaffold

- [ ] 1.1 Verify prompt text against https://x.com/mattpocockuk/status/2105951409887949107 and confirm it matches the spec string exactly
- [ ] 1.2 Create `claude-plugins/prompt-presets/.claude-plugin/plugin.json` (name, version `0.1.0`, description, author, MIT, repository, homepage, keywords) modeled on `commander`; verify `jq . plugin.json` parses
- [ ] 1.3 Create `claude-plugins/prompt-presets/package.json` (`@m0n0lab/plugin-prompt-presets`, `0.1.0`, private) and run `pnpm install`; verify lockfile updated and `pnpm nx show projects` lists it (or confirm it's excluded like `commander`)
- [ ] 1.4 Create empty-release `CHANGELOG.md` following `claude-plugins/commander/CHANGELOG.md` format

## 2. matt-retro command

- [ ] 2.1 Create `commands/matt-retro.md` with frontmatter `description` (credits Matt Pocock) and the verbatim body; verify body via `sed '1,/^---$/{/^---$/!d};1,/^---$/d' | tr -d '\n'` equals the spec string
- [ ] 2.2 Write `claude-plugins/prompt-presets/README.md`: purpose, `/prompt-presets:matt-retro` usage, source link + credit, note on session transcripts, release-flow link (per `claude-plugin-release` docs requirement); verify `pnpm nx run-many -t lint` markdown checks pass
- [ ] 2.3 Smoke test: `claude --plugin-dir ./claude-plugins/prompt-presets`, run `/prompt-presets:matt-retro`, confirm the verbatim prompt is sent

## 3. Marketplace + release wiring

- [ ] 3.1 Append `prompt-presets` entry (version `0.1.0`) to `.claude-plugin/marketplace.json`; verify existing order unchanged with `jq '.plugins[].name'`
- [ ] 3.2 Add `claude-plugins/prompt-presets` to `release-please-config.json` mirroring `commander` entry; add `"claude-plugins/prompt-presets": "0.1.0"` to `.release-please-manifest.json`; verify both parse and jsonpath name matches
- [ ] 3.3 Add plugin to `claude-plugins/README.md` / root README plugin lists if they enumerate plugins; verify with grep
- [ ] 3.4 Run `pnpm nx run-many -t lint` and `pnpm nx affected -t lint test` (no attw: no exports affected); verify green
