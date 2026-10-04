# knowledge-recall-command Specification

## Purpose

Gives a human a direct way to ask the run knowledge base what it already knows about one package, outside any update run, printing hits by match class or the package hub's persisted ranges without opening a note body in the conversation.

## Requirements

### Requirement: Command file exists

The command SHALL exist at `claude-plugins/experiments/commands/knowledge-recall.md` and SHALL be invocable as `/experiments:knowledge-recall`. Its frontmatter SHALL carry a `description`, and its body SHALL take the user input through `$ARGUMENTS`.

The body SHALL delegate the work to `match-knowledge.mjs` and to the knowledge-root resolution rule the scripts already own. It SHALL NOT restate the match-class conditions, SHALL NOT reimplement version comparison, and SHALL NOT carry its own copy of the root-resolution or exclusion rules.

#### Scenario: Command file location

- **WHEN** examining the experiments plugin structure
- **THEN** `commands/knowledge-recall.md` SHALL exist with a `description` in its frontmatter

#### Scenario: Arguments reach the command

- **WHEN** examining the command file
- **THEN** it SHALL consume the invocation arguments through `$ARGUMENTS`

#### Scenario: No duplicated logic

- **WHEN** examining the command file
- **THEN** it SHALL NOT contain the match-class conditions, the staleness rule or the exclusion rules
- **AND** it SHALL delegate matching to `match-knowledge.mjs`

---

### Requirement: Argument handling

The command SHALL accept `<pkg> [<from> <to>]`.

With no `<pkg>`, it SHALL print a single usage line naming the accepted forms and SHALL exit without consulting the base.

With `<pkg> <from> <to>`, it SHALL run the matcher over a one-package synthetic group built from those three values and SHALL print the resulting hits grouped by match class, each with its `hubPath`, its `anchor` and its `notePath`. The classification SHALL be the classification a run would obtain for the same package and range, including the exclusion of `synthetic` and `status: draft` notes and the one-hit-per-package preference order.

With `<pkg>` alone, it SHALL print the package hub's ranges table derived from the hub frontmatter: its `ranges`, its `runs` and its `latest`. It SHALL NOT run the matcher in this form.

#### Scenario: Missing package argument

- **WHEN** `/experiments:knowledge-recall` is invoked with no argument
- **THEN** a single usage line SHALL be printed
- **AND** the command SHALL exit without reading the knowledge base

#### Scenario: Package with versions prints hits by class

- **WHEN** `/experiments:knowledge-recall @nx/js 23.0.5 23.3.0` is invoked and the base holds `@nx/js 23.0.2 → 23.1.0`
- **THEN** the output SHALL list the hit under class `overlap` with delta `(23.1.0, 23.3.0]`
- **AND** SHALL print its `hubPath`, `anchor` and `notePath`

#### Scenario: Excluded notes are invisible to the command

- **WHEN** `/experiments:knowledge-recall @nx/js 23.0.2 23.1.0` is invoked and the only candidate is a note tagged `synthetic` with an identical range
- **THEN** no hit SHALL be printed

#### Scenario: Package alone prints the hub ranges table

- **WHEN** `/experiments:knowledge-recall @nx/js` is invoked and a hub exists
- **THEN** the hub's `ranges`, `runs` and `latest` SHALL be printed as a table
- **AND** the matcher SHALL NOT be run

---

### Requirement: Unknown package and absent base

When the knowledge root does not exist, the command SHALL print the single line `Knowledge: no base at <root>` and exit. When only `index.json` is missing, the ranged form SHALL rebuild it before matching; the package-only form SHALL read the durable hub directly.

When the base exists but holds no hub for the requested package, the command SHALL print one line saying so and exit.

When the base holds a hub but the requested range matches nothing, the command SHALL print one line saying there is no hit and SHALL still print the hub's ranges table.

None of these outcomes SHALL be reported as an error, and none SHALL print a stack trace, a script invocation or diagnostic noise.

#### Scenario: No base

- **WHEN** the command is invoked and the knowledge root does not exist
- **THEN** `Knowledge: no base at <root>` SHALL be printed
- **AND** the command SHALL exit without error

#### Scenario: Unknown package

- **WHEN** the command is invoked for a package with no hub
- **THEN** one line SHALL report that the base holds nothing for it
- **AND** no error and no stack trace SHALL be printed

#### Scenario: Known package, no matching range

- **WHEN** the command is invoked with versions that match no persisted range of an existing hub
- **THEN** one line SHALL report no hit
- **AND** the hub's ranges table SHALL still be printed

---

### Requirement: Context diet and read-only

The command SHALL print only paths, match classes and tables derived from frontmatter and matcher output. It SHALL NOT read a run note body, a hub section body or any raw run artefact into the conversation, and it SHALL NOT quote the hub's `### Universal`, `### Applied` or `### Summary` content.

The command SHALL NOT write, move or delete anything. It SHALL NOT persist a run, SHALL NOT edit a note or hub, and SHALL NOT touch any file outside the knowledge root; the index rebuild the matcher performs inside that root is the only permitted disk write.

#### Scenario: Note bodies stay out of the conversation

- **WHEN** the command prints a hit
- **THEN** it SHALL print the `hubPath`, `anchor` and `notePath` for the user to open
- **AND** it SHALL NOT print the body of the hub section or of the run note

#### Scenario: Nothing is written

- **WHEN** the command runs in any argument form
- **THEN** no run note, no package hub and no file outside the knowledge root SHALL be created, modified or deleted
