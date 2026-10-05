# Vantage Stock Screener

A dark, responsive Indian equity screener built with Node.js and browser-native HTML/CSS/JavaScript. Stock prices, screener fundamentals, search, financial statements, ratios, and daily history use BharatStock. Prices may be end of day.

## Run locally

Requires Node.js 20.12 or newer.

```sh
npm install
npm start
```

Open http://localhost:3000. To use another port, set the `PORT` environment variable before starting the server.

Set `BHARATSTOCK_API_KEY` in `.env` before starting locally. The server loads `.env` automatically. In Render, add it as a secret environment variable. Keep the API key server-side and out of browser code and source control.

## Project structure

- `models/stockModel.js` fetches screener, price, and company data from BharatStock.
- `controllers/stockController.js` handles API requests and responses.
- `routes/stockRoutes.js` maps API paths to controller functions.
- `models/apiDocsModel.js`, `controllers/apiDocsController.js`, and `routes/apiDocsRoutes.js` define and serve the API reference at `GET /api/docs`.
- `docs/API.md` documents the implemented Node.js routes and upstream data sources.
- `server.js` configures Express and serves the frontend from `views/`.

## Data and features

- Stock prices come from BharatStock screener data and may be end of day. The browser refreshes the data every five seconds. BharatStock also supplies financial statements, ratios, search, and daily history.
- The screener shows provider-listed stocks, paginated at 20 symbols, with available market cap, EPS, P/E, dividend yield, ROE, ROCE, and debt/equity metrics. Values absent from the provider are shown as unavailable.
- BharatStock's free tier currently allows 50 requests per day and one year of price history; some SME financial data may be missing. The app caches provider responses on the server to reduce API use.
- Company announcements continue to use the NSE endpoint. Ticker/company lookup uses BharatStock search.
- Watchlist and paper positions are stored in this browser's local storage. Paper trades do not reach a broker.
- Unsupported fields are not fabricated; unavailable values are shown as `—`.

Provider details and current limits: [BharatStock API reference](https://bharatstockapi.com/reference). This demo is for market monitoring and paper tracking, not trading advice.

