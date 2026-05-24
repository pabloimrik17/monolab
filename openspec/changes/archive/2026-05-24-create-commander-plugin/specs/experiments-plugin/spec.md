## REMOVED Requirements

### Requirement: Commander Add Command File

**Reason**: The `commander-add` command graduates from `experiments` to its own plugin and is renamed to `/commander:add`. The file moves from `claude-plugins/experiments/commands/commander-add.md` to `claude-plugins/commander/commands/add.md`.

**Migration**: The new `commander-add-command` capability owns this requirement (see `openspec/specs/commander-add-command/spec.md` after archival).

---

### Requirement: Commander Add Metadata Capture Priority

**Reason**: Moved with the command to the new `commander-add-command` capability.

**Migration**: See the `commander-add-command` capability for the A→B→C metadata-capture priority requirement and its scenarios.

---

### Requirement: Commander Add Monorepo Handling

**Reason**: Moved with the command to the new `commander-add-command` capability.

**Migration**: See the `commander-add-command` capability.

---

### Requirement: Commander Add Keyword Normalization Pipeline

**Reason**: Moved with the command to the new `commander-add-command` capability.

**Migration**: See the `commander-add-command` capability. The normalization skill itself also moves (now lives at `claude-plugins/commander/skills/commander-normalize/`) per the modified `commander-normalize-skill` capability.

---

### Requirement: Commander Add repoType Persistence

**Reason**: Moved with the command to the new `commander-add-command` capability.

**Migration**: See the `commander-add-command` capability.

---

### Requirement: Commander Add Vocabulary Suggestion Flow

**Reason**: Moved with the command to the new `commander-add-command` capability.

**Migration**: See the `commander-add-command` capability.

---

### Requirement: Commander Add Registration Flow

**Reason**: Moved with the command to the new `commander-add-command` capability.

**Migration**: See the `commander-add-command` capability.

---

### Requirement: Commander List Command File

**Reason**: The `commander-list` command graduates from `experiments` to its own plugin and is renamed to `/commander:list`. The file moves from `claude-plugins/experiments/commands/commander-list.md` to `claude-plugins/commander/commands/list.md`.

**Migration**: See the new `commander-list-command` capability.

---

### Requirement: Commander List Read-Only Behavior

**Reason**: Moved with the command to the new `commander-list-command` capability.

**Migration**: See the `commander-list-command` capability.

---

### Requirement: Commander List Empty Registry Message

**Reason**: Moved with the command to the new `commander-list-command` capability. The empty-registry message also changes its slash-command reference from `/experiments:commander-add` to `/commander:add`.

**Migration**: See the `commander-list-command` capability for the updated message.

---

### Requirement: Commander List Render Format

**Reason**: Moved with the command to the new `commander-list-command` capability.

**Migration**: See the `commander-list-command` capability.

---

### Requirement: Commander List Drift Surfacing

**Reason**: Moved with the command to the new `commander-list-command` capability.

**Migration**: See the `commander-list-command` capability.

---

### Requirement: Commander List Unsupported Registry Version Behavior

**Reason**: Moved with the command to the new `commander-list-command` capability.

**Migration**: See the `commander-list-command` capability.

---

### Requirement: Commander List No Arguments

**Reason**: Moved with the command to the new `commander-list-command` capability.

**Migration**: See the `commander-list-command` capability.

---

### Requirement: Commander List Plugin Version Bump

**Reason**: This requirement coupled the `commander-list.md` command file to the `experiments` plugin's version-bump pipeline. With the command graduating to the new `commander` plugin, version-bump for the list command flows through the `commander` plugin's release-please entry instead (see `claude-plugin-release` capability scenarios for `commander`).

**Migration**: Version-bump for `commander-list` and its sibling CRUD commands is now driven by release-please on the `claude-plugins/commander` package entry. No equivalent per-command "version bump" requirement is needed in the `commander-plugin` capability because the `claude-plugin-release` capability covers it generically.

---

### Requirement: Commander Delete Command File

**Reason**: The `commander-delete` command graduates from `experiments` to its own plugin and is renamed to `/commander:delete`. The file moves from `claude-plugins/experiments/commands/commander-delete.md` to `claude-plugins/commander/commands/delete.md`.

**Migration**: See the new `commander-delete-command` capability.

---

### Requirement: Commander Delete Target Resolution

**Reason**: Moved with the command to the new `commander-delete-command` capability.

**Migration**: See the `commander-delete-command` capability.

---

### Requirement: Commander Delete Confirmation

**Reason**: Moved with the command to the new `commander-delete-command` capability.

**Migration**: See the `commander-delete-command` capability.
