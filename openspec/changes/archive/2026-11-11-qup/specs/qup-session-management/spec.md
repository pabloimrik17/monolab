## ADDED Requirements

### Requirement: Session entity as aggregate root

The system SHALL model Session as a DDD aggregate root in `qup-domain` with identity (UUID), name, code (SessionCode value object), status (SessionStatus value object), timestamps (createdAt, closedAt). Session SHALL encapsulate its own state transition rules. All operations on sessions SHALL return `Result` or `ResultAsync` from neverthrow.

#### Scenario: Create a new session
- **WHEN** the host creates a session with a name
- **THEN** the system generates a unique 6-character alphanumeric uppercase code (SessionCode), sets status to OPEN, sets createdAt to current time, and returns `Ok<Session>`

#### Scenario: Create session with empty name
- **WHEN** the host creates a session with an empty or whitespace-only name
- **THEN** the system returns `Err<ValidationError>`

### Requirement: SessionCode value object

The system SHALL model SessionCode as an immutable value object. It SHALL be exactly 6 characters, alphanumeric, uppercase. SessionCode SHALL provide a static `generate()` factory that creates a random code and a static `from(raw: string)` factory that validates and returns `Result<SessionCode, InvalidCodeError>`.

#### Scenario: Generate a session code
- **WHEN** `SessionCode.generate()` is called
- **THEN** it returns a SessionCode with a 6-character alphanumeric uppercase string

#### Scenario: Parse a valid code
- **WHEN** `SessionCode.from("ABC123")` is called
- **THEN** it returns `Ok<SessionCode>`

#### Scenario: Parse an invalid code
- **WHEN** `SessionCode.from("abc")` is called with invalid format (wrong length, lowercase, or special chars)
- **THEN** it returns `Err<InvalidCodeError>`

### Requirement: Close a session

The system SHALL allow the host to close an open session. Closing SHALL set status to CLOSED and record closedAt timestamp. Closing an already-closed session SHALL return a typed error.

#### Scenario: Close an open session
- **WHEN** the host closes a session with status OPEN
- **THEN** the session status changes to CLOSED, closedAt is set, and the system returns `Ok<void>`

#### Scenario: Close an already closed session
- **WHEN** the host closes a session with status CLOSED
- **THEN** the system returns `Err<SessionAlreadyClosedError>`

### Requirement: Join a session by code

The system SHALL allow guests to look up an active session by its code. If the session exists and is open, it SHALL be returned. If not found or closed, a typed error SHALL be returned.

#### Scenario: Join with valid code for open session
- **WHEN** a guest provides a valid session code for an OPEN session
- **THEN** the system returns `Ok<Session>`

#### Scenario: Join with valid code for closed session
- **WHEN** a guest provides a valid session code for a CLOSED session
- **THEN** the system returns `Err<SessionClosedError>`

#### Scenario: Join with unknown code
- **WHEN** a guest provides a code that matches no session
- **THEN** the system returns `Err<SessionNotFoundError>`

### Requirement: Session repository interface

The system SHALL define a `SessionRepository` interface in `qup-domain` with methods returning `ResultAsync`. The implementation SHALL live in `qup-data` using Drizzle + PostgreSQL. The interface SHALL include: `save(session)`, `findByCode(code)`, `findById(id)`, `updateStatus(id, status, closedAt?)`.

#### Scenario: Persist a new session
- **WHEN** `save()` is called with a valid Session entity
- **THEN** the session is persisted to PostgreSQL and the saved Session is returned as `Ok<Session>`

#### Scenario: Database error during save
- **WHEN** `save()` encounters a database error
- **THEN** it returns `Err<PersistenceError>` wrapping the underlying cause

### Requirement: CreateSession use case

The system SHALL provide a `CreateSessionUseCase` class decorated with `@injectable()` in `qup-domain`. It SHALL receive `SessionRepository` via `@inject`. It SHALL generate a SessionCode, create a Session entity, persist it, and return the result.

#### Scenario: Successfully create a session
- **WHEN** the use case is executed with `{ name: "Sunday Brunch" }`
- **THEN** it creates and persists a session with a generated code and returns `Ok<Session>`

### Requirement: CloseSession use case

The system SHALL provide a `CloseSessionUseCase` class decorated with `@injectable()`. It SHALL find the session by ID, call `session.close()`, persist the updated status, and emit a `session:closed` event via EventBus.

#### Scenario: Successfully close a session
- **WHEN** the use case is executed with a valid session ID for an OPEN session
- **THEN** it closes the session, persists the change, emits `session:closed`, and returns `Ok<void>`

#### Scenario: Session not found
- **WHEN** the use case is executed with an unknown session ID
- **THEN** it returns `Err<SessionNotFoundError>`

### Requirement: GetSessionByCode use case

The system SHALL provide a `GetSessionByCodeUseCase` that validates the code format via `SessionCode.from()`, queries the repository, and returns the session or a typed error.

#### Scenario: Retrieve session by valid code
- **WHEN** the use case receives a valid, existing session code
- **THEN** it returns `Ok<Session>`

#### Scenario: Invalid code format
- **WHEN** the use case receives a malformed code
- **THEN** it returns `Err<InvalidCodeError>` without querying the database

### Requirement: Drizzle sessions table

The system SHALL define a `sessions` table in `qup-data` using Drizzle schema: `id` (UUID, PK, default random), `name` (VARCHAR 100, NOT NULL), `code` (VARCHAR 6, NOT NULL, UNIQUE), `status` (VARCHAR 10, NOT NULL, default 'OPEN'), `created_at` (TIMESTAMP, NOT NULL, default now), `closed_at` (TIMESTAMP, nullable).

#### Scenario: Table schema matches domain model
- **WHEN** the sessions table is inspected
- **THEN** it has columns for id, name, code, status, created_at, closed_at with the specified types and constraints

### Requirement: Session domain-persistence mapping

The system SHALL provide `toDomain(row)` and `toRow(entity)` mapper functions in `qup-data`. `toDomain` SHALL reconstruct the Session entity without re-validating (data from DB is trusted). `toRow` SHALL flatten the entity to database column format.

#### Scenario: Map database row to domain entity
- **WHEN** a row from the sessions table is mapped via `toDomain`
- **THEN** a Session entity is returned with all properties correctly hydrated including SessionCode and SessionStatus value objects

#### Scenario: Map domain entity to database row
- **WHEN** a Session entity is mapped via `toRow`
- **THEN** a plain object is returned with snake_case keys matching the Drizzle schema columns
