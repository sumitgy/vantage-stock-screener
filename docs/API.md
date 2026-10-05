# API reference

Base URL: `http://localhost:3000/api`

Set `BHARATSTOCK_API_KEY` in the server environment. Stock prices, screener metrics, and company data use BharatStock. NSE remains the source for company announcements.

## Node.js API routes

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/stocks?q={text}&exchange={exchange}&page=1&pageSize=20` | Lists screener results or searches listed Indian stocks. |
| GET | `/api/search?q={query}` | Searches Indian company symbols. |
| GET | `/api/quote/{symbol}` | Gets the latest available BharatStock stock profile and price data. |
| GET | `/api/history/{symbol}?range=1mo` | Gets daily historical prices. Supported ranges: `1d`, `5d`, `1mo`, `6mo`, `1y`. |
| GET | `/api/fundamentals/{symbol}?period=annual` | Gets annual or quarterly financial statements. |
| GET | `/api/ratios/{symbol}` | Gets valuation and profitability ratios. |
| GET | `/api/announcements/{symbol}` | Gets recent company announcements and filing links from NSE India. |
| GET | `/api/health` | Reports whether the BharatStock API key is configured. |
| GET | `/api/docs` | Returns the API route and upstream-provider reference as JSON. |

## Notes

- The screener uses BharatStock price and metrics data. The page refreshes data every five seconds while open; prices may be end of day.
- `/stocks` also returns `errors`, `total`, `page`, `pageSize`, `updatedAt`, and `provider`. Prices, historical data, and fundamentals come from BharatStock and may be end of day.
- `/history/{symbol}` returns `{ symbol, range, data: { time, price }[] }`; `time` is Unix milliseconds.
- `/fundamentals/{symbol}` returns normalized statement rows. Coverage varies; unavailable fields remain null or are displayed as unavailable.
- NSE may restrict or delay company announcement data.
- Invalid ticker syntax on quote/history/fundamentals/ratios returns HTTP 400.

## Upstream APIs


- BharatStock API: `https://bharatstockapi.com/v1` for Indian stock listing, prices, screener metrics, ratios, financial statements, search, and price history. Authentication is sent server-side using `X-API-Key`.
- NSE India corporate announcements: `https://www.nseindia.com/api/corporate-announcements`.
