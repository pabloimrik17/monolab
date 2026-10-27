## ADDED Requirements

### Requirement: Key-value storage

The platform SHALL offer a key-value storage: a side-free interface with text get, set and remove, typed helpers for numbers and objects written once on top of the text methods, an implementation over the browser's `localStorage` in the `./client` entry, and an in-memory one for tests and server rendering. New typed helpers SHALL be added the same way, when a consumer needs them.

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

The `./client` entry SHALL export a browser container module that binds the key-value storage to its `localStorage` implementation and binds nothing that needs `Config`, so the web's browser container never holds the API token.

#### Scenario: Browser storage resolved without configuration

- **WHEN** a container loads only the platform browser module and resolves the key-value storage
- **THEN** it gets the `localStorage` implementation and no `Config` binding is required
