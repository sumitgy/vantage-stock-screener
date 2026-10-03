# API reference

Base URL: `http://localhost:3000/api`

The same endpoint list is available as JSON at `GET /api/docs`.

## Node.js API routes

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/stocks?q={text}&exchange={exchange}&page=1&pageSize=20` | Lists one page of active U.S.-listed company stocks and available Yahoo Finance quotes. All parameters are optional. Exchanges: `All`, `NASDAQ`, `NYSE`, `NYSE American`, or `Other`. |
| GET | `/api/search?q={query}` | Searches for symbols. An empty query returns `{ "data": [] }`. |
| GET | `/api/quote/{symbol}` | Gets one symbol's quote. |
| GET | `/api/history/{symbol}?range=1mo` | Gets historical closing prices. Supported ranges: `1d`, `5d`, `1mo`, `6mo`, `1y`; other values fall back to `1mo`. |
| GET | `/api/health` | Returns `{ "ok": true, "provider": "Yahoo Finance" }` when the route responds. |
| GET | `/api/docs` | Returns the API route and upstream-provider reference as JSON. |

## Data fields

- `/stocks` responds with `data`, per-symbol `errors`, `total`, `page`, `pageSize`, `updatedAt` (Unix milliseconds), and `provider`. `pageSize` is clamped to 1-100. The directory is assembled from Nasdaq Trader's Nasdaq-listed and other-listed files, cached for up to 12 hours, and filters out ETFs, test issues, funds, warrants, rights, units, preferred shares, debt notes, and bonds. Quotes are fetched only for the requested page. Directory entries stay in `data` even if Yahoo Finance has no quote; those entries have null quote values and a `quoteError` field.
- Search, exchange, page, and page size are applied to the full symbol directory. Price-change and minimum-price UI filters apply to the currently loaded page.
- `/search` responds with `data` entries containing `symbol`, `name`, `sector`, `exchange`, `currency`, and `type`, plus `provider`.
- `/quote/{symbol}` responds with `data` and `provider`. Quote data includes the symbol/name/sector, price, previous close, change, percentage change, volume, day high/low, currency, exchange, market state, and timestamp when Yahoo Finance supplies them.
- `/history/{symbol}` responds with `symbol`, `range`, and `data` points of `{ time, price }`; `time` is Unix milliseconds.
- Invalid ticker syntax on quote/history returns HTTP 400 with `{ "error": "Invalid ticker symbol" }`.

## Upstream APIs actually used by the model

- Yahoo Finance chart endpoint: `https://query1.finance.yahoo.com/v8/finance/chart/{symbol}`. The model uses it for quotes and history, with the selected `range` and `interval` query parameters.
- Yahoo Finance search endpoint: `https://query1.finance.yahoo.com/v1/finance/search`. The model uses it for global ticker/company search.
- Nasdaq Trader symbol directory files: `https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt` and `https://www.nasdaqtrader.com/dynamic/SymDir/otherlisted.txt`. The model combines them to build the U.S. listing universe; they are directory files, not price feeds.

Yahoo Finance responses can be delayed or rate-limited. These endpoints are upstream services; they are not routes implemented by this Node.js app.
