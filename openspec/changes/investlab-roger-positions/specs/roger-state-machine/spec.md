# Roger State Machine Specification

## ADDED Requirements

### Requirement: State enum

The system SHALL define a RogerState enum with exactly 6 values.

#### Scenario: Valid states

- **WHEN** the RogerState enum is referenced
- **THEN** it contains exactly: EN_ESPERA, OPERATIVA, ROGER, COMPRAR, INVERTIDO, VENDER

### Requirement: Transition validation

The system SHALL enforce the state transition matrix. Invalid transitions are rejected.

#### Scenario: Any state to EN_ESPERA (allowed)

- **WHEN** an entry in any state transitions to EN_ESPERA
- **THEN** the transition is allowed
- **AND** quantity and commission are cleared (set to null)

#### Scenario: Any state to OPERATIVA (allowed)

- **WHEN** an entry in any state transitions to OPERATIVA
- **THEN** the transition is allowed
- **AND** quantity and commission are cleared (set to null)

#### Scenario: OPERATIVA to ROGER (allowed)

- **WHEN** an entry in OPERATIVA transitions to ROGER
- **THEN** the transition is allowed
- **AND** only desiredPrice is required

#### Scenario: EN_ESPERA to ROGER (blocked)

- **WHEN** an entry in EN_ESPERA transitions to ROGER
- **THEN** the transition is rejected with InvalidTransition error

#### Scenario: COMPRAR to ROGER (blocked)

- **WHEN** an entry in COMPRAR transitions to ROGER
- **THEN** the transition is rejected with InvalidTransition error

#### Scenario: INVERTIDO to ROGER (blocked)

- **WHEN** an entry in INVERTIDO transitions to ROGER
- **THEN** the transition is rejected with InvalidTransition error

#### Scenario: VENDER to ROGER (blocked)

- **WHEN** an entry in VENDER transitions to ROGER
- **THEN** the transition is rejected with InvalidTransition error

#### Scenario: EN_ESPERA to COMPRAR (allowed)

- **WHEN** an entry in EN_ESPERA transitions to COMPRAR
- **THEN** the transition is allowed
- **AND** quantity is required
- **AND** desiredPrice may be changed (user can set a new price)

#### Scenario: OPERATIVA to COMPRAR (allowed)

- **WHEN** an entry in OPERATIVA transitions to COMPRAR
- **THEN** the transition is allowed
- **AND** quantity is required
- **AND** desiredPrice may be changed

#### Scenario: ROGER to COMPRAR (allowed)

- **WHEN** an entry in ROGER transitions to COMPRAR
- **THEN** the transition is allowed
- **AND** quantity is required
- **AND** desiredPrice is preserved from current value

#### Scenario: VENDER to COMPRAR (allowed)

- **WHEN** an entry in VENDER transitions to COMPRAR
- **THEN** the transition is allowed
- **AND** quantity is preserved from current value
- **AND** desiredPrice is preserved from current value

#### Scenario: INVERTIDO to COMPRAR (blocked)

- **WHEN** an entry in INVERTIDO transitions to COMPRAR
- **THEN** the transition is rejected with InvalidTransition error

#### Scenario: COMPRAR to INVERTIDO (allowed)

- **WHEN** an entry in COMPRAR transitions to INVERTIDO
- **THEN** the transition is allowed
- **AND** commission is required (new field)
- **AND** desiredPrice and quantity are preserved

#### Scenario: VENDER to INVERTIDO (allowed)

- **WHEN** an entry in VENDER transitions to INVERTIDO
- **THEN** the transition is allowed
- **AND** desiredPrice, quantity, and commission are all preserved

#### Scenario: EN_ESPERA to INVERTIDO (blocked)

- **WHEN** an entry in EN_ESPERA transitions to INVERTIDO
- **THEN** the transition is rejected with InvalidTransition error

#### Scenario: OPERATIVA to INVERTIDO (blocked)

- **WHEN** an entry in OPERATIVA transitions to INVERTIDO
- **THEN** the transition is rejected with InvalidTransition error

#### Scenario: ROGER to INVERTIDO (blocked)

- **WHEN** an entry in ROGER transitions to INVERTIDO
- **THEN** the transition is rejected with InvalidTransition error

#### Scenario: INVERTIDO to VENDER (allowed)

- **WHEN** an entry in INVERTIDO transitions to VENDER
- **THEN** the transition is allowed
- **AND** desiredPrice, quantity, and commission are all preserved

#### Scenario: EN_ESPERA to VENDER (blocked)

- **WHEN** an entry in EN_ESPERA transitions to VENDER
- **THEN** the transition is rejected with InvalidTransition error

#### Scenario: OPERATIVA to VENDER (blocked)

- **WHEN** an entry in OPERATIVA transitions to VENDER
- **THEN** the transition is rejected with InvalidTransition error

#### Scenario: COMPRAR to VENDER (blocked)

- **WHEN** an entry in COMPRAR transitions to VENDER
- **THEN** the transition is rejected with InvalidTransition error

#### Scenario: ROGER to VENDER (blocked)

- **WHEN** an entry in ROGER transitions to VENDER
- **THEN** the transition is rejected with InvalidTransition error

### Requirement: Data requirements per target state

The system SHALL enforce data requirements based on the target state of a transition.

#### Scenario: Transition to EN_ESPERA requires only desiredPrice

- **WHEN** transitioning to EN_ESPERA
- **THEN** desiredPrice must be present
- **AND** quantity and commission are cleared to null

#### Scenario: Transition to OPERATIVA requires only desiredPrice

- **WHEN** transitioning to OPERATIVA
- **THEN** desiredPrice must be present
- **AND** quantity and commission are cleared to null

#### Scenario: Transition to ROGER requires only desiredPrice

- **WHEN** transitioning to ROGER
- **THEN** desiredPrice must be present
- **AND** quantity and commission remain null

#### Scenario: Transition to COMPRAR requires desiredPrice and quantity

- **WHEN** transitioning to COMPRAR without quantity
- **THEN** the transition is rejected with MissingRequiredField error

#### Scenario: Transition to COMPRAR with all required data

- **WHEN** transitioning to COMPRAR with desiredPrice and quantity
- **THEN** the transition succeeds

#### Scenario: Transition to INVERTIDO requires desiredPrice, quantity, and commission

- **WHEN** transitioning to INVERTIDO without commission
- **THEN** the transition is rejected with MissingRequiredField error

#### Scenario: Transition to INVERTIDO with all required data

- **WHEN** transitioning to INVERTIDO with desiredPrice, quantity, and commission
- **THEN** the transition succeeds

#### Scenario: Transition to VENDER requires desiredPrice, quantity, and commission

- **WHEN** transitioning to VENDER without commission
- **THEN** the transition is rejected with MissingRequiredField error

### Requirement: Default pre-filling on transition

The system SHALL pre-fill transition form fields from the current entry's values.

#### Scenario: Pre-fill quantity from current entry

- **WHEN** an entry in COMPRAR (quantity=100) transitions to INVERTIDO
- **THEN** the form pre-fills quantity with 100
- **AND** user cannot change quantity (preserved)

#### Scenario: Pre-fill commission from current entry

- **WHEN** an entry in VENDER (commission=9.99) transitions to INVERTIDO
- **THEN** the form pre-fills commission with 9.99
- **AND** user cannot change commission (preserved)

#### Scenario: Pre-fill desiredPrice but allow change to COMPRAR

- **WHEN** an entry in EN_ESPERA (desiredPrice=150) transitions to COMPRAR
- **THEN** the form pre-fills desiredPrice with 150
- **AND** user CAN change desiredPrice (price may change when entering COMPRAR from EN_ESPERA/OPERATIVA)

#### Scenario: Pre-fill desiredPrice and preserve for INVERTIDO

- **WHEN** an entry in COMPRAR (desiredPrice=155) transitions to INVERTIDO
- **THEN** desiredPrice is preserved as 155
- **AND** user cannot change desiredPrice

#### Scenario: No pre-fill for fields not in current state

- **WHEN** an entry in EN_ESPERA (no quantity, no commission) transitions to COMPRAR
- **THEN** quantity field is empty (user must fill it)
- **AND** desiredPrice is pre-filled from current value
