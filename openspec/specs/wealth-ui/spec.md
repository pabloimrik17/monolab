## ADDED Requirements

### Requirement: Display ticker list
The app SHALL display a vertical list of tickers sorted alphabetically with their current quotes.

#### Scenario: Show tickers with quotes
- **WHEN** user has tickers ["MSFT", "AAPL"] and quotes are loaded
- **THEN** list shows AAPL first, then MSFT, each with price displayed

#### Scenario: Show loading state
- **WHEN** quotes are being fetched
- **THEN** display loading indicator or placeholder prices

#### Scenario: Empty state
- **WHEN** user has no tickers
- **THEN** display message prompting to add tickers

### Requirement: Add ticker
The app SHALL allow users to add a ticker symbol via input field.

#### Scenario: Add valid ticker
- **WHEN** user types "GOOGL" and submits
- **THEN** ticker is added to list and quotes start fetching

#### Scenario: Clear input after add
- **WHEN** user successfully adds a ticker
- **THEN** input field is cleared

### Requirement: Remove ticker
The app SHALL allow users to remove a ticker from the list.

#### Scenario: Remove via button
- **WHEN** user clicks remove button on "AAPL" row
- **THEN** AAPL is removed from list

### Requirement: Auto-refresh quotes
The app SHALL automatically refresh quotes at configured interval.

#### Scenario: Periodic refresh
- **WHEN** app is running with tickers
- **THEN** quotes refresh every 15-30 seconds automatically

#### Scenario: Show last update time
- **WHEN** quotes are refreshed
- **THEN** display timestamp of last successful refresh

### Requirement: Quote display format
The app SHALL display quote data in readable format.

#### Scenario: Show price and change
- **WHEN** quote is available for ticker
- **THEN** display price and change percentage (e.g., "$182.52 +1.2%")

#### Scenario: Color code changes
- **WHEN** change is positive
- **THEN** display in green
- **WHEN** change is negative
- **THEN** display in red
