# Vantage Stock Screener

A dark, responsive equity screener built with Node.js and browser-native HTML/CSS/JavaScript. It fetches current quotes, symbol search results, and historical chart data from Yahoo Finance through the Node server. Install dependencies with `npm install` before starting; no API key is needed; Yahoo Finance may delay, throttle, or change access to its unofficial endpoints.

## Run locally

Requires Node.js 18 or newer.

```sh
npm install
npm start
```

Open http://localhost:3000. To use another port, set the `PORT` environment variable before starting the server.

## Project structure

- `models/stockModel.js` loads a cached U.S. listed-company directory from Nasdaq Trader and fetches page quotes from Yahoo Finance.
- `controllers/stockController.js` handles API requests and responses.
- `routes/stockRoutes.js` maps API paths to controller functions.
- `models/apiDocsModel.js`, `controllers/apiDocsController.js`, and `routes/apiDocsRoutes.js` define and serve the API reference at `GET /api/docs`.
- `docs/API.md` documents the implemented Node.js routes and the Yahoo Finance upstream endpoints they call.
- `server.js` configures Express and serves the frontend from `views/`.

## Data and features

- Quote fields (price, daily change, volume, day high/low) and historical chart series are fetched live from Yahoo Finance. Quote refreshes are cached for 25 seconds and the UI refreshes about every 45 seconds.
- The screener uses Nasdaq Trader's Nasdaq-listed and other-listed directories for active U.S. company symbols, excluding ETFs, test issues, funds, warrants, rights, units, preferred shares, and debt instruments. It shows 20 symbols per page and fetches quotes for the current page only.
- Some directory symbols may not have a Yahoo Finance quote. Those symbols remain listed with unavailable quote values; Yahoo Finance may delay or throttle quote requests.
- Global ticker/company lookup remains a separate Yahoo Finance search and can open other symbols supported by that provider.
- Watchlist and paper positions are stored in this browser's local storage. Paper trades do not reach a broker.
- Market cap, P/E, beta and 52-week values are not fabricated; unavailable fundamentals are shown as `â€”`.

Yahoo Finance endpoints are unofficial and can be rate-limited. This free-source demo is for market monitoring and paper tracking, not trading advice.

