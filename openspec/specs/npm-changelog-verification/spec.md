# npm-changelog-verification Specification

## Purpose

Integrity verification for cached changelog content, including SHA256 hashing, write-back verification, retry logic, and structured failure tracking.

## Requirements

### Requirement: Remote Content Hashing

The skill SHALL compute a SHA256 hash of every changelog content immediately upon receiving it from any remote source (Strategy A, B, or C).

This hash SHALL be stored as `remoteSha256` in the version's metadata.

The skill SHALL use `echo -n "{content}" | shasum -a 256` (or equivalent) to compute hashes.

#### Scenario: Hash computed on fetch

- **WHEN** the skill receives changelog content for version 19.0.0 from raw CHANGELOG.md
- **THEN** the skill SHALL compute SHA256 of the received content before any disk write

---

### Requirement: Write-Back Verification

After writing a version file to disk, the skill SHALL read the file back and compute its SHA256 hash.

The read-back hash (`sha256`) SHALL be compared against the remote hash (`remoteSha256`).

If they match, the version status SHALL be set to `verified`.

#### Scenario: Successful verification

- **WHEN** `sha256` equals `remoteSha256` after write
- **THEN** `{version}.meta.json` SHALL have `status: "verified"`

#### Scenario: Write corruption detected

- **WHEN** `sha256` does NOT equal `remoteSha256` after write
- **THEN** the skill SHALL retry the write (up to 2 additional attempts)

---

### Requirement: Write Retry on Mismatch

If write-back verification fails, the skill SHALL retry writing the file up to 2 additional times (3 total attempts).

Each retry SHALL re-write the original content and re-verify.

If all 3 attempts fail verification, the version SHALL be marked as `failed` with reason `write_verification_failed`.

#### Scenario: Retry succeeds on second attempt

- **WHEN** the first write fails verification but the second write succeeds
- **THEN** the version SHALL be marked `verified` with `attempts: 2`

#### Scenario: All retries exhausted

- **WHEN** all 3 write attempts fail verification
- **THEN** `{version}.meta.json` SHALL have `status: "failed"`, `failReason: "write_verification_failed"`, `retryable: true`, `attempts: 3`

---

### Requirement: Failure Reasons

The skill SHALL mark failed versions with one of these specific reasons:

| Reason | When Applied |
|---|---|
| `no_entry_found` | Version has no matching heading in the parsed CHANGELOG file |
| `empty_release_body` | GitHub Release exists but `body` is empty/null |
| `no_changelog_source` | All three strategies (A, B, C) returned 404 or failed |
| `fetch_error` | Network or command error during retrieval |
| `write_verification_failed` | SHA256 mismatch after 3 write attempts |

#### Scenario: no_entry_found

- **WHEN** a version exists in npm but has no entry in the CHANGELOG and no GitHub Release
- **THEN** `failReason` SHALL be `no_entry_found`

#### Scenario: empty_release_body

- **WHEN** GitHub Release for a tag exists but body is empty
- **THEN** `failReason` SHALL be `empty_release_body`

#### Scenario: fetch_error

- **WHEN** `curl` or `gh api` returns a non-404 error (network timeout, 500, etc.)
- **THEN** `failReason` SHALL be `fetch_error`

---

### Requirement: Retryable Flag

All failed versions SHALL have `retryable: true` to allow future invocations to reattempt retrieval.

The `retryable` flag SHALL only be set to `false` if explicitly determined that the version will never have a changelog (reserved for future use; currently all failures are retryable).

#### Scenario: Failed version is retryable

- **WHEN** any version is marked `status: "failed"`
- **THEN** `retryable` SHALL be `true`

#### Scenario: Future retry succeeds

- **WHEN** a previously failed version is retried and succeeds
- **THEN** the metadata SHALL be updated to `status: "verified"` with incremented `attempts`

---

### Requirement: Raw Source Hash File

When storing a raw CHANGELOG source file in `_source/`, the skill SHALL also write a `{filename}.sha256` file containing the hex-encoded SHA256 hash.

This hash SHALL be used to detect if the remote file changed on subsequent fetches (when TTL has expired).

#### Scenario: Hash file created

- **WHEN** `_source/CHANGELOG.md` is written
- **THEN** `_source/CHANGELOG.md.sha256` SHALL contain the SHA256 hex string

#### Scenario: Remote change detection

- **WHEN** TTL has expired and the file is re-fetched
- **THEN** the skill SHALL compare the new content's hash against `_source/CHANGELOG.md.sha256` to determine if the file changed
