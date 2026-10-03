const knownStockMetadata = [
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
const directoryUrls = [
  'https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt',
  'https://www.nasdaqtrader.com/dynamic/SymDir/otherlisted.txt'
];
const directoryCacheMs = 12 * 60 * 60 * 1000;
let directoryCache = null;

function parseDirectory(text, isNasdaq) {
  const lines = text.split(/\r?\n/);
  const headers = lines.shift().split('|');
  return lines.filter(line => line && !line.startsWith('File Creation Time:')).map(line => {
    const fields = line.split('|');
    const entry = Object.fromEntries(headers.map((header, index) => [header, fields[index] || '']));
    const symbol = isNasdaq ? entry.Symbol : (entry['NASDAQ Symbol'] || entry['ACT Symbol']);
    const name = entry['Security Name'].trim();
    const exchangeCode = isNasdaq ? 'NASDAQ' : entry.Exchange;
    const exchange = ({ N: 'NYSE', A: 'NYSE American', P: 'NYSE Arca', Z: 'Cboe', V: 'IEX' })[exchangeCode] || exchangeCode;
    const excludedSecurity = /\b(?:warrants?|rights?|units?|preferred|notes?|debentures?|bonds?|funds?)\b/i.test(name);
    if (!symbol || !name || entry['Test Issue'] === 'Y' || entry.ETF === 'Y' || excludedSecurity) return null;
    return { symbol: symbol.trim(), name, sector: '—', exchange };
  }).filter(Boolean);
}

async function getStockDirectory() {
  if (directoryCache && Date.now() - directoryCache.at < directoryCacheMs) return directoryCache.data;
  try {
    const responses = await Promise.all(directoryUrls.map(url => fetch(url, { headers: { 'User-Agent': 'VantageScreener/1.0', Accept: 'text/plain' }, signal: AbortSignal.timeout(15000) })));
    for (const response of responses) {
      if (!response.ok) throw new Error(`Nasdaq Trader symbol directory returned ${response.status}`);
    }
    const [nasdaqText, otherText] = await Promise.all(responses.map(response => response.text()));
    const sectors = new Map(knownStockMetadata.map(stock => [stock.symbol, stock.sector]));
    const data = [...parseDirectory(nasdaqText, true), ...parseDirectory(otherText, false)]
      .map(stock => ({ ...stock, sector: sectors.get(stock.symbol) || '—' }));
    const unique = [...new Map(data.map(stock => [stock.symbol, stock])).values()].sort((a, b) => a.symbol.localeCompare(b.symbol));
    if (!unique.length) throw new Error('Nasdaq Trader returned an empty stock directory');
    directoryCache = { at: Date.now(), data: unique };
    return unique;
  } catch (error) {
    if (directoryCache?.data?.length) return directoryCache.data;
    throw error;
  }
}

async function findStocks({ query = '', exchange = 'All', page = 1, pageSize = 20 } = {}) {
  const directory = await getStockDirectory();
  const normalizedQuery = query.toLowerCase();
  const primaryExchanges = ['NASDAQ', 'NYSE', 'NYSE American'];
  const filtered = directory.filter(stock => (exchange === 'All' ||
      (exchange === 'Other' ? !primaryExchanges.includes(stock.exchange) : stock.exchange === exchange)) &&
    (!normalizedQuery || stock.symbol.toLowerCase().includes(normalizedQuery) || stock.name.toLowerCase().includes(normalizedQuery)));
  const offset = (page - 1) * pageSize;
  return { data: filtered.slice(offset, offset + pageSize), total: filtered.length, page, pageSize };
}

function findStock(symbol) {
  return knownStockMetadata.find(stock => stock.symbol === symbol);
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
    name: (!stock.name || stock.name === stock.symbol) ? (meta.longName || meta.shortName || stock.symbol) : stock.name,
    price,
    previousClose,
    change,
    changePct: previousClose ? change / previousClose * 100 : 0,
    volume: meta.regularMarketVolume ?? quote.volume?.filter(Number.isFinite).at(-1) ?? null,
    dayHigh: meta.regularMarketDayHigh ?? null,
    dayLow: meta.regularMarketDayLow ?? null,
    currency: meta.currency || 'USD',
    exchange: stock.exchange || meta.exchangeName || '',
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
