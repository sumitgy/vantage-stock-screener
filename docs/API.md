# API reference

Base URL: `http://localhost:3000/api`

The same endpoint list is available as JSON at `GET /api/docs`.

## Node.js API routes

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/stocks?q={text}&sector={sector}` | Lists built-in screener stocks and available quotes. `q` and `sector` are optional; sectors are `All`, `Tech`, `Fin`, `Energy`, `Health`, and `Cons`. |
| GET | `/api/search?q={query}` | Searches for symbols. An empty query returns `{ "data": [] }`. |
| GET | `/api/quote/{symbol}` | Gets one symbol's quote. |
| GET | `/api/history/{symbol}?range=1mo` | Gets historical closing prices. Supported ranges: `1d`, `5d`, `1mo`, `6mo`, `1y`; other values fall back to `1mo`. |
| GET | `/api/health` | Returns `{ "ok": true, "provider": "Yahoo Finance" }` when the route responds. |
| GET | `/api/docs` | Returns the API route and upstream-provider reference as JSON. |

## Data fields

- `/stocks` responds with `data`, per-symbol `errors`, `updatedAt` (Unix milliseconds), and `provider`.
- `/search` responds with `data` entries containing `symbol`, `name`, `sector`, `exchange`, `currency`, and `type`, plus `provider`.
- `/quote/{symbol}` responds with `data` and `provider`. Quote data includes the symbol/name/sector, price, previous close, change, percentage change, volume, day high/low, currency, exchange, market state, and timestamp when Yahoo Finance supplies them.
- `/history/{symbol}` responds with `symbol`, `range`, and `data` points of `{ time, price }`; `time` is Unix milliseconds.
- Invalid ticker syntax on quote/history returns HTTP 400 with `{ "error": "Invalid ticker symbol" }`.

## Upstream APIs actually used by the model

- Yahoo Finance chart endpoint: `https://query1.finance.yahoo.com/v8/finance/chart/{symbol}`. The model uses it for quotes and history, with the selected `range` and `interval` query parameters.
- Yahoo Finance search endpoint: `https://query1.finance.yahoo.com/v1/finance/search`. The model uses it for global ticker/company search.

Yahoo Finance responses can be delayed or rate-limited. These endpoints are upstream services; they are not routes implemented by this Node.js app.
