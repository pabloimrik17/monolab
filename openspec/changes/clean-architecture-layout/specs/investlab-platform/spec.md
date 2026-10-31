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

The `./browser` entry SHALL export only a browser container module that binds the key-value storage token to the `localStorage` implementation; the interface, the in-memory implementation and the token come from the root entry. That module SHALL import nothing that needs `Config` or the InvestLab API client, so the web's browser container never holds the API token.

#### Scenario: Browser storage resolved without configuration

- **WHEN** a container loads only the platform browser module and resolves the key-value storage
- **THEN** it gets the `localStorage` implementation and no `Config` binding is required

### Requirement: Platform root and runtime entries

`@m0n0lab/investlab-platform` SHALL export exactly four entries: the root entry `.` with its side-free pieces (the key-value storage interface, its in-memory implementation and token, and the `HttpClient` types), and one per runtime its consumers run in: `./server`, `./client` and `./browser`. A runtime entry SHALL NOT re-export a side-free piece. The platform MAY import `@m0n0lab/investlab-core`. It SHALL NOT import any business module or `@m0n0lab/investlab-database`.

#### Scenario: Side-free pieces from the root entry

- **WHEN** the quotes ticker storage repository needs the `KeyValueStorage` interface and its token
- **THEN** it imports them from `@m0n0lab/investlab-platform`, and no runtime entry exports them

#### Scenario: Kernel errors come from core

- **WHEN** a domain file needs `ValidationError`
- **THEN** it imports it from `@m0n0lab/investlab-core`, not from the platform

#### Scenario: Browser entry holds no credentialed code

- **WHEN** the platform is built
- **THEN** `dist/browser.js` and the chunks it imports contain no InvestLab API client, no `Config` adapter and no token that names either

## REMOVED Requirements

### Requirement: Platform entries

**Reason**: It allowed only `./server` and `./client` and forbade a root entry. The platform now has a side-free root entry `.` next to one entry per runtime.

**Migration**: Replaced by "Platform root and runtime entries". Side-free pieces (the key-value storage and the `HttpClient` types) come from `@m0n0lab/investlab-platform`; runtime pieces from `./server`, `./client` or `./browser`.
