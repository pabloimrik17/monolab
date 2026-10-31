## ADDED Requirements

### Requirement: Key-value storage

The platform SHALL offer a key-value storage: a side-free interface with text get, set and remove, typed helpers for numbers and objects written once on top of the text methods, an implementation over the browser's `localStorage`, and an in-memory one for tests and server rendering. New typed helpers SHALL be added the same way, when a consumer needs them.

#### Scenario: Number round trip

- **WHEN** a number is stored with the typed helper and read back with it
- **THEN** the same number is returned, in both implementations

#### Scenario: Object round trip

- **WHEN** an object is stored with the typed helper and read back with it
- **THEN** an equal object is returned

#### Scenario: Missing key

- **WHEN** a key that was never stored is read
- **THEN** the storage returns no value instead of throwing

#### Scenario: Unreadable stored value

- **WHEN** a key holds text that is not valid for the typed helper reading it
- **THEN** the storage returns no value instead of throwing

### Requirement: Browser container module

The `./browser` entry SHALL export the key-value storage interface, its in-memory implementation, its token, and a browser container module that binds it to the `localStorage` implementation. That module SHALL import nothing that needs `Config` or the InvestLab API client, so the web's browser container never holds the API token.

#### Scenario: Browser storage resolved without configuration

- **WHEN** a container loads only the platform browser module and resolves the key-value storage
- **THEN** it gets the `localStorage` implementation and no `Config` binding is required

## MODIFIED Requirements

### Requirement: Platform entries

`@m0n0lab/investlab-platform` SHALL export exactly three entries, one per runtime its consumers run in: `./server`, `./client` and `./browser`, and no root entry. A side-free piece SHALL be re-exported by each runtime entry that needs it. It MAY import `@m0n0lab/investlab-core`. It SHALL NOT import any business module or `@m0n0lab/investlab-database`.

#### Scenario: No root entry

- **WHEN** code imports `@m0n0lab/investlab-platform` without a subpath
- **THEN** the import fails to resolve

#### Scenario: Kernel errors come from core

- **WHEN** a domain file needs `ValidationError`
- **THEN** it imports it from `@m0n0lab/investlab-core`, not from the platform

#### Scenario: Browser entry holds no credentialed code

- **WHEN** the platform is built
- **THEN** `dist/browser.js` and the chunks it imports contain no InvestLab API client, no `Config` adapter and no token that names either
