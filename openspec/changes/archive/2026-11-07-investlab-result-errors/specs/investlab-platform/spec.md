## MODIFIED Requirements

### Requirement: Key-value storage

The platform SHALL offer a key-value storage: a side-free interface with text get, set and remove, typed helpers for numbers and objects written once on top of the text methods, an implementation over the browser's `localStorage`, and an in-memory one for tests and server rendering. New typed helpers SHALL be added the same way, when a consumer needs them. The object helper SHALL check the stored JSON against a schema the caller supplies and never cast it.

#### Scenario: Number round trip

- **WHEN** a number is stored with the typed helper and read back with it
- **THEN** the same number is returned, in both implementations

#### Scenario: Object round trip

- **WHEN** an object is stored with the typed helper and read back with it and a schema of its shape
- **THEN** an equal object is returned

#### Scenario: Missing key

- **WHEN** a key that was never stored is read
- **THEN** the storage returns no value instead of throwing

#### Scenario: Unreadable stored value

- **WHEN** a key holds text that is not valid for the typed helper reading it
- **THEN** the storage returns no value instead of throwing

#### Scenario: Stored object of another shape

- **WHEN** `{ "symbol": "AAPL" }` is stored with the object helper and read back with a schema for a list of strings
- **THEN** the storage returns no value, in both implementations
