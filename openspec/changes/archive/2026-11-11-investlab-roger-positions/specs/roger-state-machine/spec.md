# Roger State Machine Specification

## Purpose

Defines the lifecycle of a Roger entry: its seven states, which transitions are allowed, the fields each state carries, how a transition fills and clears them, the value rules, the time in state, and re-entry after a sale.

## ADDED Requirements

### Requirement: Roger states

An entry SHALL be in exactly one of seven states: `WATCHING`, `SHORTLISTED`, `TRADER_BOUGHT`, `BUY_ORDER`, `INVESTED`, `SELL_ORDER` or `SOLD`. `WATCHING`, `SHORTLISTED` and `TRADER_BOUGHT` SHALL form the radar.

#### Scenario: State list

- **WHEN** the Roger states are listed
- **THEN** they are exactly `WATCHING`, `SHORTLISTED`, `TRADER_BOUGHT`, `BUY_ORDER`, `INVESTED`, `SELL_ORDER` and `SOLD`, and the radar is `WATCHING`, `SHORTLISTED` and `TRADER_BOUGHT`

### Requirement: Transitions from the radar

An entry on the radar SHALL be able to move to another radar state, to `BUY_ORDER` (order placed) or to `INVESTED` (market buy), and to no other state.

#### Scenario: Between radar states

- **WHEN** a `WATCHING` entry transitions to `TRADER_BOUGHT`
- **THEN** the transition succeeds

#### Scenario: Trader bought to a buy order

- **WHEN** a `TRADER_BOUGHT` entry transitions to `BUY_ORDER` with a quantity
- **THEN** the transition succeeds

#### Scenario: Market buy

- **WHEN** a `SHORTLISTED` entry transitions to `INVESTED` with quantity, buy commission and buy date
- **THEN** the transition succeeds

#### Scenario: Radar to a sell order

- **WHEN** a `WATCHING` entry transitions to `SELL_ORDER`
- **THEN** it fails with `code` `INVALID_TRANSITION` and the entry is unchanged

### Requirement: Transitions from a buy order

A `BUY_ORDER` entry SHALL be able to move to a radar state (order cancelled) or to `INVESTED` (order filled), and to no other state.

#### Scenario: Order filled

- **WHEN** a `BUY_ORDER` entry transitions to `INVESTED` with buy commission and buy date
- **THEN** the transition succeeds

#### Scenario: Order cancelled

- **WHEN** a `BUY_ORDER` entry transitions to `SHORTLISTED`
- **THEN** the transition succeeds

#### Scenario: Buy order straight to sold

- **WHEN** a `BUY_ORDER` entry transitions to `SOLD`
- **THEN** it fails with `code` `INVALID_TRANSITION`

### Requirement: Transitions from invested

An `INVESTED` entry SHALL be able to move to `SELL_ORDER` (order placed) or to `SOLD` (manual sale), and to no other state. It SHALL NOT return to the radar or to `BUY_ORDER`.

#### Scenario: Sell order placed

- **WHEN** an `INVESTED` entry transitions to `SELL_ORDER` with an exit price
- **THEN** the transition succeeds

#### Scenario: Manual sale

- **WHEN** an `INVESTED` entry transitions to `SOLD` with exit price, sell commission and sell date
- **THEN** the transition succeeds

#### Scenario: Invested back to the radar

- **WHEN** an `INVESTED` entry transitions to `WATCHING`
- **THEN** it fails with `code` `INVALID_TRANSITION`

#### Scenario: Invested to a buy order

- **WHEN** an `INVESTED` entry transitions to `BUY_ORDER`
- **THEN** it fails with `code` `INVALID_TRANSITION`

### Requirement: Transitions from a sell order

A `SELL_ORDER` entry SHALL be able to move to `INVESTED` (order cancelled) or to `SOLD` (order filled), and to no other state.

#### Scenario: Sell order filled

- **WHEN** a `SELL_ORDER` entry transitions to `SOLD` with sell commission and sell date
- **THEN** the transition succeeds

#### Scenario: Sell order cancelled

- **WHEN** a `SELL_ORDER` entry transitions to `INVESTED`
- **THEN** the transition succeeds

#### Scenario: Sell order to a buy order

- **WHEN** a `SELL_ORDER` entry transitions to `BUY_ORDER`
- **THEN** it fails with `code` `INVALID_TRANSITION`

### Requirement: Sold is final

A `SOLD` entry SHALL NOT transition to any state. It SHALL remain as the record of the closed trade.

#### Scenario: Sold back to invested

- **WHEN** a `SOLD` entry transitions to `INVESTED`
- **THEN** it fails with `code` `INVALID_TRANSITION` and the entry is unchanged

### Requirement: No transition to the same state

A transition whose target is the entry's current state SHALL fail with `code` `INVALID_TRANSITION` and change nothing.

#### Scenario: Watching to watching

- **WHEN** a `WATCHING` entry transitions to `WATCHING`
- **THEN** it fails with `code` `INVALID_TRANSITION`

### Requirement: Fields per state

Each state SHALL carry exactly these fields:

- radar: entry price
- `BUY_ORDER`: entry price, quantity
- `INVESTED`: entry price, quantity, buy commission, buy date
- `SELL_ORDER`: the `INVESTED` fields plus exit price
- `SOLD`: the `SELL_ORDER` fields plus sell commission and sell date

Every field of an entry's state SHALL be set.

#### Scenario: Watching entry

- **WHEN** a `WATCHING` entry is read
- **THEN** it has an entry price and no quantity, commissions, dates or exit price

#### Scenario: Sold entry

- **WHEN** a `SOLD` entry is read
- **THEN** it has entry price, quantity, buy commission, buy date, exit price, sell commission and sell date

### Requirement: Transition values

A transition SHALL take, for each field of the target state, the value supplied with the transition, or else the entry's current value. A target field with neither SHALL fail the transition with `code` `MISSING_REQUIRED_FIELD` naming the field. Fields the target state does not carry SHALL be cleared.

#### Scenario: Supplied value wins

- **WHEN** a `SHORTLISTED` entry with entry price 150 transitions to `BUY_ORDER` with entry price 148 and quantity 10
- **THEN** the entry has entry price 148 and quantity 10

#### Scenario: Current value kept

- **WHEN** a `BUY_ORDER` entry with entry price 148 and quantity 10 transitions to `INVESTED` with buy commission 2 and buy date 2026-11-06 only
- **THEN** the entry keeps entry price 148 and quantity 10

#### Scenario: Missing field

- **WHEN** a `WATCHING` entry transitions to `BUY_ORDER` without a quantity
- **THEN** it fails with `code` `MISSING_REQUIRED_FIELD` naming the quantity, and the entry is unchanged

#### Scenario: Cancelling a buy order clears the quantity

- **WHEN** a `BUY_ORDER` entry with quantity 10 transitions to `WATCHING`
- **THEN** the entry has no quantity

#### Scenario: Cancelling a sell order clears the exit price

- **WHEN** a `SELL_ORDER` entry with exit price 180 transitions to `INVESTED`
- **THEN** the entry has no exit price and keeps its buy fields

### Requirement: Field values

Entry and exit prices SHALL be greater than 0 with at most 4 decimals, and at most 9999999999.9999. Quantity SHALL be a whole number greater than 0 and at most 2147483647. Commissions SHALL be 0 or more with at most 2 decimals, and at most 99999999.99. Dates SHALL be calendar dates, and the sell date SHALL NOT be before the buy date. A value that breaks a rule SHALL fail with `code` `VALIDATION_ERROR`.

#### Scenario: Value over its limit

- **WHEN** an entry is given entry price 10000000000
- **THEN** it fails with `code` `VALIDATION_ERROR`

#### Scenario: Fractional quantity

- **WHEN** an entry transitions to `BUY_ORDER` with quantity 2.5
- **THEN** it fails with `code` `VALIDATION_ERROR`

#### Scenario: Sold before bought

- **WHEN** an entry bought on 2026-11-06 transitions to `SOLD` with sell date 2026-11-05
- **THEN** it fails with `code` `VALIDATION_ERROR`

#### Scenario: Free trade

- **WHEN** an entry transitions to `INVESTED` with buy commission 0
- **THEN** the transition succeeds

### Requirement: Time in state

An entry SHALL record since when it is in its current state. It SHALL be set when the entry is created and on every transition, and SHALL NOT change when fields are edited.

#### Scenario: Transition resets the time in state

- **WHEN** an entry in `BUY_ORDER` since 2026-11-01 transitions to `INVESTED` on 2026-11-06
- **THEN** it is in `INVESTED` since 2026-11-06

#### Scenario: Edit keeps the time in state

- **WHEN** the entry price of a `WATCHING` entry is edited
- **THEN** its time in state is unchanged

### Requirement: Re-entry after a sale

Re-entering from a `SOLD` entry SHALL create a new entry for the same instrument in `BUY_ORDER`, with the sold entry's entry price and quantity unless others are supplied. The sold entry SHALL stay unchanged. Re-entering from any other state SHALL fail with `code` `INVALID_TRANSITION`.

#### Scenario: Quick re-entry

- **WHEN** a `SOLD` entry with entry price 150 and quantity 10 is re-entered with entry price 145
- **THEN** a new `BUY_ORDER` entry exists for the same instrument with entry price 145 and quantity 10, and the sold entry is unchanged

#### Scenario: Re-entry from invested

- **WHEN** an `INVESTED` entry is re-entered
- **THEN** it fails with `code` `INVALID_TRANSITION` and no entry is created
