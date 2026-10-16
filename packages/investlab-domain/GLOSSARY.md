# InvestLab

InvestLab is a personal investment tool with Portfolio, describing what the user holds and its target allocation, and Roger, a stock-trading methodology with a position lifecycle. Both share an Instrument catalog.

## Language

### Catalog

**Instrument**:
An investable thing in the shared catalog, identified by its symbol: a stock, ETF, index fund, crypto asset or bond. Shared by Portfolio and Roger.
_Avoid_: asset, security, ticker when meaning the thing itself.

**Instrument type**:
The kind of instrument: ETF, index fund, stock, crypto or bond.
_Avoid_: asset class when meaning the kind of instrument.

**Asset class**:
The economic bucket an instrument belongs to: equity, fixed income, commodity or crypto.
_Avoid_: instrument type when meaning the economic bucket.

**Sector**:
The industry sector of a stock; not set for ETFs or funds.
_Avoid_: asset class.

**Replicates**:
The index or asset an ETF or fund tracks, such as “S&P 500” or “Gold”.
_Avoid_: sector when meaning the tracked index or asset.

### Portfolio

**PortfolioItem**:
A user's holding of one Instrument at one Broker, with its target weight, current value and optional notes. The same Instrument may appear in several items, at different brokers or as separate lines.
_Avoid_: holding, position on the Portfolio side.

**Broker**:
The custodian where a PortfolioItem is held, such as IBKR or MyInvestor, expressed as free text. Roger is a methodology, never a broker.
_Avoid_: platform.

**Target weight**:
The percentage share of the portfolio the user wants a PortfolioItem to represent. Targets need not sum to 100%.
_Avoid_: current weight.

**Current value**:
The market value of a PortfolioItem, entered by hand for now.
_Avoid_: purchase cost.

### Pricing

**Quotable**:
Whether an instrument's price is available automatically. Index funds are typically not quotable; their value is entered by hand.
_Avoid_: tradable when meaning automatic price availability.

**Ticker**:
The symbol under which a quotable instrument trades, such as NVDA. The current home page “ticker list” is a legacy browser watch list, scheduled to be retired or moved when the overview page lands, not a separate concept.
_Avoid_: ticker for the instrument itself.

Not yet modelled: Entry, Roger state, Allocation and Contribution.
