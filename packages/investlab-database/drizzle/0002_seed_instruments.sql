-- Seed the instrument catalog; a symbol already in the catalog keeps its row.
INSERT INTO "instruments" ("symbol", "name", "type", "asset_class", "exchange", "sector", "replicates", "quotable") VALUES
	('AAPL', 'Apple Inc.', 'stock', 'equity', 'NASDAQ', 'technology', NULL, true),
	('MSFT', 'Microsoft Corporation', 'stock', 'equity', 'NASDAQ', 'technology', NULL, true),
	('NVDA', 'NVIDIA Corporation', 'stock', 'equity', 'NASDAQ', 'technology', NULL, true),
	('AMZN', 'Amazon.com, Inc.', 'stock', 'equity', 'NASDAQ', 'consumer_discretionary', NULL, true),
	('GOOGL', 'Alphabet Inc. Class A', 'stock', 'equity', 'NASDAQ', 'communication', NULL, true),
	('META', 'Meta Platforms, Inc.', 'stock', 'equity', 'NASDAQ', 'communication', NULL, true),
	('TSLA', 'Tesla, Inc.', 'stock', 'equity', 'NASDAQ', 'consumer_discretionary', NULL, true),
	('SPY', 'SPDR S&P 500 ETF Trust', 'etf', 'equity', 'NYSE Arca', NULL, 'S&P 500', true),
	('QQQ', 'Invesco QQQ Trust', 'etf', 'equity', 'NASDAQ', NULL, 'Nasdaq-100', true),
	('VTI', 'Vanguard Total Stock Market ETF', 'etf', 'equity', 'NYSE Arca', NULL, 'CRSP US Total Market', true)
ON CONFLICT ("symbol") DO NOTHING;
