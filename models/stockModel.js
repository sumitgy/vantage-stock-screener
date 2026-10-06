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

<<<<<<< Updated upstream
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
=======
async function providerGet(path, { cacheMs = providerCacheMs } = {}) {
  const apiKey = "bsk_live_uRv5T4YvLsD442mIQwkPP382z2t4rGTdIiE41xLuiqs";
  if (!apiKey) throw new Error('BHARATSTOCK_API_KEY is not configured');
  const cached = providerCache.get(path);
  if (cached && Date.now() - cached.at < cacheMs) return cached.data;
  const response = await fetch(`${providerBaseUrl}${path}`, {
    headers: { 'X-API-Key': apiKey, Accept: 'application/json' },
    signal: AbortSignal.timeout(20000)
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = body.detail || body.message || body.error || `HTTP ${response.status}`;
    throw new Error(`BharatStock API: ${detail}`);
  }
  providerCache.set(path, { at: Date.now(), data: body });
  return body;
}

function parseCsvLine(line) {
  const fields = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && quoted && line[index + 1] === '"') { field += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { fields.push(field); field = ''; }
    else field += char;
  }
  fields.push(field);
  return fields;
}

function parseDirectory(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
  const headers = parseCsvLine(lines.shift()).map(header => header.trim());
  const allowedSeries = new Set(['EQ', 'BE', 'BZ', 'SM', 'ST', 'SZ', 'E1', 'E2']);
  return lines.map(line => {
    const fields = parseCsvLine(line);
    const entry = Object.fromEntries(headers.map((header, index) => [header, (fields[index] || '').trim()]));
    const symbol = entry.SYMBOL;
    const name = entry['NAME OF COMPANY'];
    const series = entry.SERIES;
    if (!symbol || !name || !allowedSeries.has(series) || /\b(?:ETF|EXCHANGE TRADED FUND|MUTUAL FUND|REIT|INVIT)\b/i.test(name)) return null;
    return { symbol, name, sector: '—', exchange: series === 'SM' || series === 'ST' || series === 'SZ' ? 'NSE SME' : 'NSE', series };
>>>>>>> Stashed changes
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

async function getHistory(symbol, range = '1mo', date = '') {
  const allowedRanges = new Set(['1d', '5d', '1mo', '6mo', '1y']);
  if (!allowedRanges.has(range)) range = '1mo';
<<<<<<< Updated upstream
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
=======
  const dateIsValid = /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(`${date}T00:00:00Z`)) && new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date;
  if (date && !dateIsValid) throw new Error('Date must be a valid YYYY-MM-DD date');
  const days = ({ '1d': 1, '5d': 5, '1mo': 31, '6mo': 183, '1y': 365 })[range];
  const from = date || new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const query = new URLSearchParams({ from, page: '1', page_size: '1000' });
  if (date) query.set('to', date);
  const path = `/stocks/${encodeURIComponent(symbol.replace(/\.NS$/, ''))}/prices?${query}`;
  const result = await providerGet(path);
  const rows = Array.isArray(result) ? result : result.data || [];
  return rows.map(row => ({ time: new Date(`${row.trade_date}T12:00:00Z`).getTime(), price: Number(row.adjusted_close ?? row.close), volume: (row.volume ?? row.volume_traded ?? row.total_traded_quantity) == null ? null : Number.isFinite(Number(row.volume ?? row.volume_traded ?? row.total_traded_quantity)) ? Number(row.volume ?? row.volume_traded ?? row.total_traded_quantity) : null }))
    .filter(point => Number.isFinite(point.price) && (!date || new Date(point.time).toISOString().slice(0, 10) === date)).reverse();
}

async function getFundamentals(symbol, period = 'annual') {
  if (!['annual', 'quarterly'].includes(period)) period = 'annual';
  const ticker = symbol.replace(/\.NS$/, '');
  const cacheKey = `${ticker}:${period}`;
  const cached = fundamentalsCache.get(cacheKey);
  if (cached && Date.now() - cached.at < providerCacheMs) return cached.data;
  const result = await providerGet(`/stocks/${encodeURIComponent(ticker)}/financials?${new URLSearchParams({ period_type: period, page: '1', page_size: period === 'quarterly' ? '20' : '12' })}`);
  const rows = Array.isArray(result) ? result : result.data || [];
  const data = rows.map(row => ({
    ...row,
    date: row.period_end_date || row.fiscal_year || '',
    TotalRevenue: row.revenue ?? row.sales ?? row.total_income ?? null,
    QuarterlyExpenses: Number.isFinite(row.interest_expended) && Number.isFinite(row.operating_expenses)
      ? row.operating_expenses + (Number.isFinite(row.provisions_and_contingencies) ? row.provisions_and_contingencies : 0)
      : row.total_expenses ?? row.total_expense ?? row.expenses ?? (Number.isFinite(row.cost_of_revenue) && Number.isFinite(row.operating_expenses) ? row.cost_of_revenue + row.operating_expenses : null),
    CostOfRevenue: row.cost_of_revenue ?? (Number.isFinite(row.cost_of_materials_consumed) ? row.cost_of_materials_consumed + (Number.isFinite(row.purchases_of_stock_in_trade) ? row.purchases_of_stock_in_trade : 0) : null),
    GrossProfit: row.gross_profit ?? null,
    OperatingExpense: row.operating_expenses ?? null,
    OperatingIncome: row.operating_profit ?? row.operating_profit_pre_provision ?? row.operating_income ?? null,
    OtherIncome: row.other_income ?? null,
    InterestExpenseNonOperating: row.interest_expense ?? row.finance_costs ?? row.interest_expended ?? row.interest ?? null,
    Depreciation: row.depreciation ?? row.depreciation_and_amortisation ?? row.depreciation_and_amortization ?? null,
    PretaxIncome: row.profit_before_tax ?? row.pretax_income ?? null,
    TaxProvision: row.tax ?? row.tax_expense ?? null,
    CasaRatioPct: row.casa_ratio_pct ?? row.casa_ratio ?? row.casa_percentage ?? null,
    GrossNpaPct: row.gross_npa_pct ?? (Number.isFinite(row.gross_npa) && Number.isFinite(row.advances) && row.advances !== 0 ? row.gross_npa / row.advances * 100 : null),
    NetNpaPct: row.net_npa_pct ?? (Number.isFinite(row.net_npa) && Number.isFinite(row.advances) && row.advances !== 0 ? row.net_npa / row.advances * 100 : null),
    BranchCount: row.number_of_branches ?? row.branch_count ?? row.branches ?? null,
    CustomerCount: row.number_of_customers ?? row.customer_count ?? row.total_customers ?? null,
    AdvancesMarketSharePct: row.market_share_in_system_advances_pct ?? row.advances_market_share_pct ?? row.market_share_advances_pct ?? null,
    DepositsMarketSharePct: row.market_share_in_system_deposits_pct ?? row.deposits_market_share_pct ?? row.market_share_deposits_pct ?? null,
    DividendPayoutPct: row.dividend_payout_pct ?? row.dividend_payout_ratio ?? row.dividend_payout ?? null,
    RawPdfUrl: row.raw_pdf_url ?? row.source_pdf_url ?? row.pdf_url ?? row.filing_url ?? null,
    NetIncome: row.net_profit ?? row.net_income ?? null,
    BasicEPS: row.eps ?? row.basic_eps ?? null,
    DilutedEPS: row.diluted_eps ?? null,
    BasicAverageShares: row.shares_outstanding ?? null,
    EquityCapital: row.paid_up_equity_capital ?? null,
    Reserves: row.other_equity ?? null,
    Borrowings: Number.isFinite(row.borrowings_current) && Number.isFinite(row.borrowings_non_current) ? row.borrowings_current + row.borrowings_non_current : row.total_debt ?? null,
    OtherLiabilities: Number.isFinite(row.total_liabilities) && Number.isFinite(row.borrowings_current) && Number.isFinite(row.borrowings_non_current) ? row.total_liabilities - row.borrowings_current - row.borrowings_non_current : null,
    BalanceSheetLiabilities: Number.isFinite(row.total_assets) ? row.total_assets : Number.isFinite(row.total_equity) && Number.isFinite(row.total_liabilities) ? row.total_equity + row.total_liabilities : null,
    FixedAssets: row.property_plant_equipment ?? row.property_plant_and_equipment ?? row.fixed_assets ?? null,
    CapitalWorkInProgress: row.capital_work_in_progress ?? row.capital_work_in_progress_cwip ?? row.cwip ?? row.construction_work_in_progress ?? null,
    Investments: row.investments ?? row.non_current_investments ?? row.current_investments ?? null,
    OtherAssets: Number.isFinite(row.total_assets) && Number.isFinite(row.property_plant_equipment ?? row.property_plant_and_equipment ?? row.fixed_assets) && Number.isFinite(row.capital_work_in_progress ?? row.capital_work_in_progress_cwip ?? row.cwip ?? row.construction_work_in_progress) && Number.isFinite(row.investments ?? row.non_current_investments ?? row.current_investments)
      ? row.total_assets - (row.property_plant_equipment ?? row.property_plant_and_equipment ?? row.fixed_assets) - (row.capital_work_in_progress ?? row.capital_work_in_progress_cwip ?? row.cwip ?? row.construction_work_in_progress) - (row.investments ?? row.non_current_investments ?? row.current_investments)
      : null,
    TotalAssets: row.total_assets ?? null,
    CurrentAssets: row.current_assets ?? null,
    CashAndCashEquivalents: row.cash_and_equivalents ?? row.cash_and_cash_equivalents ?? null,
    TotalLiabilitiesNetMinorityInterest: row.total_liabilities ?? row.total_liabilities_net_minority_interest ?? null,
    CurrentLiabilities: row.current_liabilities ?? null,
    StockholdersEquity: row.total_equity ?? row.stockholders_equity ?? null,
    ReturnOnEquity: row.roe ?? row.return_on_equity ?? null,
    TotalDebt: row.total_debt ?? row.borrowings ?? null,
    TradeReceivablesCurrent: row.trade_receivables_current ?? null,
    Inventories: row.inventories ?? row.inventory ?? null,
    TradePayablesCurrent: row.trade_payables_current ?? null,
    WorkingCapital: row.working_capital ?? null,
    ReceivablesDays: row.receivables_days ?? row.debtor_days ?? null,
    InventoryDays: row.inventory_days ?? row.inventories_days ?? null,
    PayablesDays: row.payables_days ?? row.days_payable ?? null,
    WorkingCapitalDays: row.working_capital_days ?? null,
    ReturnOnCapitalEmployed: row.roce ?? row.return_on_capital_employed ?? null,
    OperatingCashFlow: row.cash_flow_operating ?? row.operating_cash_flow ?? null,
    InvestingCashFlow: row.cash_flow_investing ?? row.investing_cash_flow ?? null,
    FinancingCashFlow: row.cash_flow_financing ?? row.financing_cash_flow ?? null,
    CapitalExpenditure: row.capex ?? row.capital_expenditure ?? null,
    FreeCashFlow: row.free_cash_flow ?? (Number.isFinite(row.cash_flow_operating) && Number.isFinite(row.capex) ? row.cash_flow_operating - row.capex : null),
    NetCashFlow: row.net_change_in_cash ?? null,
    PermanentEmployees: row.permanent_employees ?? row.employee_count ?? row.employees ?? null,
    ResearchAndDevelopment: row.rd_expenditure ?? row.research_and_development ?? row.research_development_expense ?? null,
    ResearchAndDevelopmentPct: row.rd_expenditure_pct ?? row.research_and_development_pct ?? row.rd_as_pct_of_turnover ?? null,
    ExportRevenue: row.export_revenue ?? row.exports_revenue ?? row.exports ?? null,
    OrderBookPosition: row.order_book_position ?? row.order_book_value ?? row.order_book ?? null
  }));
  fundamentalsCache.set(cacheKey, { at: Date.now(), data });
  return data;
}

async function getRatios(symbol) {
  const ticker = symbol.replace(/\.NS$/, '');
  return providerGet(`/stocks/${encodeURIComponent(ticker)}/ratios`);
}

async function getShareholding(symbol) {
  const ticker = symbol.replace(/\.NS$/, '');
  const result = await providerGet(`/stocks/${encodeURIComponent(ticker)}/shareholding`);
  const rows = Array.isArray(result) ? result : Array.isArray(result.data) ? result.data : result.data && typeof result.data === 'object' ? [result.data] : result.as_on_date ? [result] : [];
  const numeric = value => value == null || value === '' || !Number.isFinite(Number(value)) ? null : Number(value);
  return rows.map(row => ({
    ...row,
    date: row.as_on_date || row.period_end_date || row.date || '',
    promoter_pct: numeric(row.promoter_pct ?? row.promoter_holding_pct ?? row.promoter_holding),
    fii_pct: numeric(row.fii_pct ?? row.fii_holding_pct ?? row.fii_holding ?? row.foreign_institutional_investors_pct),
    dii_pct: numeric(row.dii_pct ?? row.dii_holding_pct ?? row.dii_holding ?? row.domestic_institutional_investors_pct),
    government_pct: numeric(row.government_pct ?? row.government_holding_pct ?? row.government_holding ?? row.govt_holding_pct),
    public_pct: numeric(row.public_pct ?? row.public_holding_pct ?? row.public_holding),
    shareholder_count: numeric(row.shareholder_count ?? row.number_of_shareholders ?? row.total_shareholders)
  })).sort((a, b) => a.date.localeCompare(b.date));
}

async function getInsiderTrades(symbol) {
  const ticker = symbol.replace(/\.NS$/, '');
  const query = new URLSearchParams({ page: '1', page_size: '50' });
  const result = await providerGet(`/stocks/${encodeURIComponent(ticker)}/insider-trades?${query}`);
  return Array.isArray(result) ? result : result.data || [];
}

async function getPeers(symbol) {
  const ticker = symbol.replace(/\.NS$/, '');
  const profile = await providerGet(`/stocks/${encodeURIComponent(ticker)}`);
  if (!profile.sector) return { sector: null, data: [] };
  const query = new URLSearchParams({ sector: profile.sector, sort_by: 'market_cap', sort_order: 'desc', page: '1', page_size: '100' });
  const peers = await providerGet(`/screener?${query}`);
  return { sector: profile.sector, data: peers.data || [] };
}

async function getCompanyAnnouncements(symbol) {
  const query = new URLSearchParams({ index: 'equities', symbol });
  const url = `https://www.nseindia.com/api/corporate-announcements?${query}`;
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36';
  const landing = await fetch('https://www.nseindia.com/', { headers: { 'User-Agent': userAgent, Accept: 'text/html' }, signal: AbortSignal.timeout(10000) });
  const cookies = landing.headers.getSetCookie?.() || (landing.headers.get('set-cookie') || '').split(/,(?=[^;,\s]+=)/);
  const cookie = cookies.map(value => value.split(';', 1)[0]).filter(Boolean).join('; ');
  const response = await fetch(url, {
    headers: { 'User-Agent': userAgent, Accept: 'application/json', Referer: 'https://www.nseindia.com/', ...(cookie ? { Cookie: cookie } : {}) },
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error(`NSE announcements returned ${response.status}`);
  const payload = await response.json();
  const rows = Array.isArray(payload) ? payload : payload.data || [];
  return rows.filter(row => !row.symbol || row.symbol.toUpperCase() === symbol.toUpperCase()).slice(0, 30).map(row => ({
    date: row.an_dt || row.sort_date || row.dt || '',
    title: row.desc || row.subject || row.sm_name || 'Company announcement',
    details: row.attchmntText || '',
    url: row.attchmntFile || row.attachmentURL || ''
  }));
}

module.exports = { findStocks, findStock, getQuote, getQuotes, searchStocks, getHistory, getFundamentals, getRatios, getShareholding, getInsiderTrades, getPeers, getCompanyAnnouncements, isConfigured: () => Boolean(process.env.BHARATSTOCK_API_KEY) };
>>>>>>> Stashed changes
