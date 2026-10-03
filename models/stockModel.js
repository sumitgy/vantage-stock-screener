const stocks = [
  ['AAPL', 'Apple Inc.', 'Tech'], ['MSFT', 'Microsoft Corporation', 'Tech'], ['NVDA', 'NVIDIA Corporation', 'Tech'],
  ['AMZN', 'Amazon.com, Inc.', 'Cons'], ['META', 'Meta Platforms, Inc.', 'Tech'], ['GOOGL', 'Alphabet Inc.', 'Tech'],
  ['TSLA', 'Tesla, Inc.', 'Cons'], ['AVGO', 'Broadcom Inc.', 'Tech'], ['JPM', 'JPMorgan Chase & Co.', 'Fin'],
  ['V', 'Visa Inc.', 'Fin'], ['LLY', 'Eli Lilly and Company', 'Health'], ['WMT', 'Walmart Inc.', 'Cons'],
  ['XOM', 'Exxon Mobil Corporation', 'Energy'], ['UNH', 'UnitedHealth Group Incorporated', 'Health'],
  ['MA', 'Mastercard Incorporated', 'Fin'], ['COST', 'Costco Wholesale Corporation', 'Cons'],
  ['HD', 'The Home Depot, Inc.', 'Cons'], ['NFLX', 'Netflix, Inc.', 'Tech'], ['JNJ', 'Johnson & Johnson', 'Health'],
  ['PG', 'The Procter & Gamble Company', 'Cons']
].map(([symbol, name, sector]) => ({ symbol, name, sector }));

const quoteCache = new Map();
const yahooHeaders = { 'User-Agent': 'Mozilla/5.0 VantageScreener/1.0' };

function findStocks({ query = '', sector = 'All' } = {}) {
  const normalizedQuery = query.toLowerCase();
  return stocks.filter(stock => (sector === 'All' || stock.sector === sector) &&
    (!normalizedQuery || stock.symbol.toLowerCase().includes(normalizedQuery) || stock.name.toLowerCase().includes(normalizedQuery)));
}

function findStock(symbol) {
  return stocks.find(stock => stock.symbol === symbol);
}

async function getQuote(stock) {
  const cached = quoteCache.get(stock.symbol);
  if (cached && Date.now() - cached.at < 25000) return cached.data;

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(stock.symbol)}?range=1d&interval=5m`;
  const response = await fetch(url, { headers: yahooHeaders });
  if (!response.ok) throw new Error(`Market data provider returned ${response.status}`);

  const json = await response.json();
  const result = json.chart?.result?.[0];
  if (!result) throw new Error(json.chart?.error?.description || 'No quote returned');

  const meta = result.meta || {};
  const quote = result.indicators?.quote?.[0] || {};
  const closes = (quote.close || []).filter(Number.isFinite);
  const price = Number(meta.regularMarketPrice ?? closes.at(-1));
  const previousClose = Number(meta.chartPreviousClose ?? meta.previousClose ?? price);
  const change = price - previousClose;
  const data = {
    ...stock,
    name: stock.name === '—' ? (meta.longName || meta.shortName || stock.symbol) : stock.name,
    price,
    previousClose,
    change,
    changePct: previousClose ? change / previousClose * 100 : 0,
    volume: meta.regularMarketVolume ?? quote.volume?.filter(Number.isFinite).at(-1) ?? null,
    dayHigh: meta.regularMarketDayHigh ?? null,
    dayLow: meta.regularMarketDayLow ?? null,
    currency: meta.currency || 'USD',
    exchange: meta.exchangeName || '',
    marketState: meta.marketState || 'UNKNOWN',
    timestamp: meta.regularMarketTime ? meta.regularMarketTime * 1000 : Date.now()
  };

  quoteCache.set(stock.symbol, { at: Date.now(), data });
  return data;
}

async function searchStocks(query) {
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=12&newsCount=0&enableFuzzyQuery=true`;
  const response = await fetch(url, { headers: yahooHeaders });
  if (!response.ok) throw new Error(`Market search returned ${response.status}`);

  const result = await response.json();
  return (result.quotes || [])
    .filter(item => item.symbol && ['EQUITY', 'ETF', 'MUTUALFUND'].includes(item.quoteType))
    .map(item => ({
      symbol: item.symbol,
      name: item.longname || item.shortname || item.symbol,
      sector: item.sector || '—',
      exchange: item.exchDisp || item.exchange || '',
      currency: item.currency || 'USD',
      type: item.quoteType || 'EQUITY'
    }));
}

async function getHistory(symbol, range = '1mo') {
  const allowedRanges = new Set(['1d', '5d', '1mo', '6mo', '1y']);
  if (!allowedRanges.has(range)) range = '1mo';
  const interval = range === '1d' ? '5m' : range === '5d' ? '30m' : '1d';
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`;
  const response = await fetch(url, { headers: yahooHeaders });
  if (!response.ok) throw new Error(`Market data provider returned ${response.status}`);

  const json = await response.json();
  const result = json.chart?.result?.[0];
  if (!result) throw new Error(json.chart?.error?.description || 'No chart history returned');
  const values = result.indicators?.quote?.[0]?.close || [];
  return (result.timestamp || []).map((time, index) => ({ time: time * 1000, price: values[index] }))
    .filter(point => Number.isFinite(point.price));
}

module.exports = { findStocks, findStock, getQuote, searchStocks, getHistory };
