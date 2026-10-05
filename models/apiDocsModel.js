const apiDocs = {
  title: 'Vantage Screener API',
  basePath: '/api',
  note: 'Stock prices and company data are supplied by BharatStock and may be end of day.',
  endpoints: [
    {
      method: 'GET',
      path: '/api/stocks',
      description: 'Lists one page of Indian stocks with BharatStock screener metrics and end-of-day prices.',
      query: {
        q: 'Optional ticker or company-name filter.',
        exchange: 'Optional exchange filter: All, NSE, or BSE.',
        page: 'Optional 1-based page number; defaults to 1.',
        pageSize: 'Optional number of symbols per page (1-50); defaults to 20.'
      },
      response: '{ data: (Quote | { symbol, name, price: null, quoteError })[], errors: { symbol, message }[], total: number, page: number, pageSize: number, updatedAt: number, provider: string }'
    },
    {
      method: 'GET',
      path: '/api/search?q={query}',
      description: 'Searches Indian stock symbols using BharatStock; an empty q returns an empty data array.',
      response: '{ data: { symbol, name, sector, exchange, currency, type }[], provider: string }'
    },
    {
      method: 'GET',
      path: '/api/quote/{symbol}',
      description: 'Gets the latest available BharatStock stock profile and price data.',
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
      path: '/api/fundamentals/{symbol}?period=annual',
      description: 'Gets reported income, balance-sheet, or cash-flow statements from BharatStock. Set period to annual or quarterly.',
      response: '{ symbol: string, period: string, data: { date: string, ...reportedValues }[], provider: string }'
    },
    {
      method: 'GET',
      path: '/api/ratios/{symbol}',
      description: 'Gets valuation and profitability ratios from BharatStock.',
      response: '{ symbol: string, data: object, provider: string }'
    },
    {
      method: 'GET',
      path: '/api/peers/{symbol}',
      description: 'Gets sector peers with daily screener metrics from BharatStock.',
      response: '{ symbol: string, sector: string, data: object[], provider: string }'
    },
    {
      method: 'GET',
      path: '/api/announcements/{symbol}',
      description: 'Gets recent company announcements and filing links from NSE India.',
      response: '{ symbol: string, data: { date, title, details, url }[], provider: string }'
    },
    {
      method: 'GET',
      path: '/api/health',
      description: 'Reports that the API process is responding.',
      response: '{ ok: true, provider: string, configured: boolean }'
    },
    {
      method: 'GET',
      path: '/api/docs',
      description: 'Returns this API route reference.'
    }
  ],
  upstream: [
    {
      provider: 'BharatStock',
      purpose: 'Indian stock listing, screener metrics, financial statements, ratios, search, and historical prices.',
      url: 'https://bharatstockapi.com/v1'
    },
    {
      provider: 'NSE India',
      purpose: 'Company announcements and filing links.',
      url: 'https://www.nseindia.com/api/corporate-announcements'
    }
  ]
};

module.exports = apiDocs;
