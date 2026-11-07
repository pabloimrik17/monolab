# InvestLab

InvestLab is a personal investment tool with Portfolio, describing what the user holds and its target allocation, and Roger, which follows a trader's stock calls through an entry lifecycle. Both share an Instrument catalog.

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
The custodian where a PortfolioItem is held, such as IBKR or MyInvestor, expressed as free text. Roger is a trader, never a broker.
_Avoid_: platform.

**Target weight**:
The percentage share of the portfolio the user wants a PortfolioItem to represent. Targets need not sum to 100%.
_Avoid_: current weight.

**Current value**:
The market value of a PortfolioItem, entered by hand for now.
_Avoid_: purchase cost.

**Stock picking**:
The part of the user's investments held in individual stocks, whether bought following a trader such as Roger or on the user's own.
_Avoid_: Roger when meaning all individual stocks.

### Pricing

**Quotable**:
Whether an instrument's price is available automatically. Index funds are typically not quotable; their value is entered by hand.
_Avoid_: tradable when meaning automatic price availability.

**Ticker**:
The symbol under which a quotable instrument trades, such as NVDA. The current home page “ticker list” is a legacy browser watch list, scheduled to be retired or moved when the overview page lands, not a separate concept.
_Avoid_: ticker for the instrument itself.

### Roger

**Roger**:
The trader whose stock calls the user follows. A person, never a broker.

**Entry**:
One trade of a stock that follows Roger, from the moment it is on the radar until it is sold. A stock may have several entries at different prices.
_Avoid_: position, holding.

**Daily report**:
Roger's report listing the stocks to follow closely each day, because they are near their entry price.
_Avoid_: operativa.

**Radar**:
The states in which an Entry is followed with nothing bought or ordered: Watching, Shortlisted and Trader bought.
_Avoid_: watch list.

**Watching**:
An Entry on the radar whose entry price is still far from the market price.

**Shortlisted**:
An Entry on the radar whose entry price is near the market price, as Roger's daily report flags.
_Avoid_: operativa.

**Trader bought**:
An Entry Roger has bought and the user has not, yet or at all.

**Buy order**:
An Entry with a buy order placed and not yet filled.

**Invested**:
An Entry whose shares the user holds.

**Sell order**:
An Entry with a sell order placed and not yet filled.

**Sold**:
An Entry whose shares have been sold. It stays as the record of the closed trade.
_Avoid_: closed position.

**Entry price**:
The price at which an Entry buys: the target until it is invested, the price actually paid afterwards.
_Avoid_: desired price.

**Exit price**:
The price at which an Entry sells: the order's price while the sell order is open, the price actually received once sold.

Not yet modelled: Allocation and Contribution.
