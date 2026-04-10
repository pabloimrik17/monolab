# quote-polling Specification

## Purpose

Periodic auto-refresh of stock quotes with configurable intervals and error recovery.

## Requirements

### Requirement: Start polling
The system SHALL start periodic quote fetching when start() is called.

#### Scenario: Start polling with tickers
- **WHEN** poller.start(["AAPL", "MSFT"], onUpdate) is called
- **THEN** immediately fetches quotes and calls onUpdate with results
- **THEN** continues fetching at configured interval

#### Scenario: Start polling with empty list
- **WHEN** poller.start([], onUpdate) is called
- **THEN** does not fetch or call onUpdate

### Requirement: Stop polling
The system SHALL stop periodic fetching when stop() is called.

#### Scenario: Stop active polling
- **WHEN** poller.stop() is called while polling
- **THEN** stops scheduling further polls (in-flight requests may still complete)

#### Scenario: Stop inactive polling
- **WHEN** poller.stop() is called when not polling
- **THEN** no-op, no error thrown

### Requirement: Configure polling interval
The system SHALL allow configuring the polling interval between 15-60 seconds.

#### Scenario: Set valid interval
- **WHEN** poller.setInterval(30000) is called
- **THEN** polling interval changes to 30 seconds

#### Scenario: Set interval below minimum
- **WHEN** poller.setInterval(5000) is called
- **THEN** interval is clamped to minimum 15000ms

#### Scenario: Set interval above maximum
- **WHEN** poller.setInterval(120000) is called
- **THEN** interval is clamped to maximum 60000ms

### Requirement: Update ticker list
The system SHALL allow updating the ticker list while polling.

#### Scenario: Update tickers while polling
- **WHEN** poller.setTickers(["GOOGL", "TSLA"]) is called while polling
- **THEN** next fetch uses new ticker list

### Requirement: Handle fetch errors
The system SHALL gracefully handle fetch errors without stopping the polling loop.

#### Scenario: Network error during poll
- **WHEN** fetch fails due to network error
- **THEN** onError callback is called with error
- **THEN** polling continues at next interval

#### Scenario: Partial fetch failure
- **WHEN** some tickers fail to fetch
- **THEN** onUpdate called with successful quotes
- **THEN** polling continues

### Requirement: Callback interface
The system SHALL notify consumers via callbacks for updates and errors.

#### Scenario: Receive quote updates
- **WHEN** quotes are fetched successfully
- **THEN** onUpdate(Map<symbol, Quote>) is called

#### Scenario: Receive error notification
- **WHEN** fetch fails
- **THEN** onError(Error) is called if provided

### Requirement: Polling state
The system SHALL expose current polling state.

#### Scenario: Check if polling
- **WHEN** poller.isPolling() is called
- **THEN** returns true if polling active, false otherwise
