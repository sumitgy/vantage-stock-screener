const apiDocs = {
  title: 'Vantage Screener API',
  basePath: '/api',
  note: 'These are the routes implemented by this Node.js server. Market data is fetched from Yahoo Finance; endpoints may be delayed or rate-limited.',
  endpoints: [
    {
      method: 'GET',
      path: '/api/stocks',
      description: 'Lists the built-in screener symbols and their available quotes.',
      query: {
        q: 'Optional ticker or company-name filter.',
        sector: 'Optional sector filter: All, Tech, Fin, Energy, Health, or Cons.'
      },
      response: '{ data: Quote[], errors: { symbol, message }[], updatedAt: number, provider: string }'
    },
    {
      method: 'GET',
      path: '/api/search?q={query}',
      description: 'Searches Yahoo Finance symbols; an empty q returns an empty data array.',
      response: '{ data: { symbol, name, sector, exchange, currency, type }[], provider: string }'
    },
    {
      method: 'GET',
      path: '/api/quote/{symbol}',
      description: 'Gets a quote for a ticker symbol.',
      response: '{ data: Quote, provider: string }'
    },
    {
      method: 'GET',
      path: '/api/history/{symbol}?range=1mo',
      description: 'Gets chart close prices. Supported ranges: 1d, 5d, 1mo, 6mo, 1y; unsupported ranges use 1mo.',
      response: '{ symbol: string, range: string, data: { time: number, price: number }[] }'
    },
    {
      method: 'GET',
      path: '/api/health',
      description: 'Reports that the API process is responding.',
      response: '{ ok: true, provider: string }'
    },
    {
      method: 'GET',
      path: '/api/docs',
      description: 'Returns this API route reference.'
    }
  ],
  upstream: [
    {
      provider: 'Yahoo Finance',
      purpose: 'Quote and chart data',
      urlPattern: 'https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?range={range}&interval={interval}'
    },
    {
      provider: 'Yahoo Finance',
      purpose: 'Symbol search',
      urlPattern: 'https://query1.finance.yahoo.com/v1/finance/search?q={query}&quotesCount=12&newsCount=0&enableFuzzyQuery=true'
    }
  ]
};

module.exports = apiDocs;
