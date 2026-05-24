## MODIFIED Requirements

### Requirement: Empty-registry short-circuit handled by skill

The command SHALL surface the skill's empty-registry behavior verbatim. The command SHALL NOT add a wrapper message, table, or extra prompt when the skill prints `No projects registered. Use /commander:add to register one.`.

#### Scenario: Empty registry surface-through

- **WHEN** the registry is missing and the skill prints the empty-registry message
- **THEN** the command exits zero immediately after the skill returns; no further output is emitted
