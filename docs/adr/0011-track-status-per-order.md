# Track fulfillment status per order

Qup tracks one fulfillment status for an entire order instead of a separate status for each order item. The host prepares and serves an order as a unit, so item-level tracking would add operational steps and substantial domain, persistence, API, event, and UI complexity without helping the intended home gathering workflow.
