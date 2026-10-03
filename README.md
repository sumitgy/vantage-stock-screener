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

- `models/stockModel.js` contains the ticker data and Yahoo Finance access.
- `controllers/stockController.js` handles API requests and responses.
- `routes/stockRoutes.js` maps API paths to controller functions.
- `models/apiDocsModel.js`, `controllers/apiDocsController.js`, and `routes/apiDocsRoutes.js` define and serve the API reference at `GET /api/docs`.
- `docs/API.md` documents the implemented Node.js routes and the Yahoo Finance upstream endpoints they call.
- `server.js` configures Express and serves the frontend from `views/`.

## Data and features

- Quote fields (price, daily change, volume, day high/low) and historical chart series are fetched live from Yahoo Finance. Quote refreshes are cached for 25 seconds and the UI refreshes about every 45 seconds.
- The screener table starts with 20 large US tickers. Global ticker/company lookup can open additional symbols supported by Yahoo Finance; suffixes may be needed for some exchanges (for example, `.NS` for NSE listings).
- Global lookup does not mean every listed company or exchange is covered. Yahoo Finance can omit symbols, delay quotes, throttle requests, or change its endpoints without notice.
- Watchlist and paper positions are stored in this browser's local storage. Paper trades do not reach a broker.
- Market cap, P/E, beta and 52-week values are not fabricated; unavailable fundamentals are shown as `â€”`.

Yahoo Finance endpoints are unofficial and can be rate-limited. This free-source demo is for market monitoring and paper tracking, not trading advice.

