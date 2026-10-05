const knownStockMetadata = [];
const providerBaseUrl = 'https://bharatstockapi.com/v1';
const providerCache = new Map();
const providerCacheMs = 12 * 60 * 60 * 1000;
const directoryUrl = 'https://archives.nseindia.com/content/equities/EQUITY_L.csv';
const directoryCacheMs = 12 * 60 * 60 * 1000;
let directoryCache = null;
const fundamentalsCache = new Map();

async function providerGet(path, { cacheMs = providerCacheMs } = {}) {
  const apiKey = "bsk_live_FKVtrCRI4qn8nVtWF1TLQMA5UtuchFv5w96GVp82dSg";
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
  }).filter(Boolean);
}

async function getStockDirectory() {
  if (directoryCache && Date.now() - directoryCache.at < directoryCacheMs) return directoryCache.data;
  try {
    const response = await fetch(directoryUrl, { headers: { 'User-Agent': 'Mozilla/5.0 VantageScreener/1.0', Accept: 'text/csv,text/plain' }, signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`NSE India equity directory returned ${response.status}`);
    const text = await response.text();
    if (!text.includes('SYMBOL') || !text.includes('NAME OF COMPANY')) throw new Error('NSE India returned an invalid equity directory');
    const sectors = new Map(knownStockMetadata.map(stock => [stock.symbol, stock.sector]));
    const data = parseDirectory(text)
      .map(stock => ({ ...stock, sector: sectors.get(stock.symbol) || '—' }));
    const unique = [...new Map(data.map(stock => [stock.symbol, stock])).values()].sort((a, b) => a.symbol.localeCompare(b.symbol));
    if (!unique.length) throw new Error('NSE India returned an empty stock directory');
    directoryCache = { at: Date.now(), data: unique };
    return unique;
  } catch (error) {
    if (directoryCache?.data?.length) return directoryCache.data;
    throw error;
  }
}

async function findStocks({ query = '', exchange = 'All', page = 1, pageSize = 20 } = {}) {
  const params = new URLSearchParams({ page: String(page), page_size: String(Math.min(200, pageSize)) });
  let result;
  if (query.trim()) {
    params.set('q', query.trim());
    result = await providerGet(`/stocks?${params}`);
  } else {
    params.set('sort_by', 'market_cap');
    params.set('sort_order', 'desc');
    if (exchange === 'NSE' || exchange === 'BSE') params.set('exchange', exchange);
    result = await providerGet(`/screener?${params}`);
  }
  const rows = result.data || [];
  const data = rows.map(row => ({
    symbol: row.symbol,
    name: row.company_name || row.name || row.symbol,
    sector: row.sector || '—',
    exchange: row.exchange || 'NSE',
    series: row.series || 'EQ',
    price: row.price ?? null,
    marketCap: row.market_cap ?? null,
    peRatio: row.pe_ratio ?? null,
    eps: row.eps ?? null,
    dividendYield: row.dividend_yield ?? null,
    roe: row.roe ?? null,
    roce: row.roce ?? null,
    fiftyTwoWeekHigh: row.high_52w ?? null,
    fiftyTwoWeekLow: row.low_52w ?? null,
    debtToEquity: row.debt_to_equity ?? null,
    revenueGrowth: row.revenue_growth_yoy ?? null,
    profitGrowth: row.profit_growth_yoy ?? null,
    volume: row.avg_volume_30d ?? null,
    previousClose: null,
    change: null,
    changePct: row.change_pct ?? null,
    marketState: 'EOD'
  }));
  return { data, total: result.pagination?.total_items ?? data.length, page, pageSize };
}

function findStock(symbol) {
  return knownStockMetadata.find(stock => stock.symbol === symbol);
}

async function getQuotes(stocks) {
  return stocks.map(stock => ({ ...stock, currency: 'INR', marketState: 'EOD' }));
}

async function getQuote(stock) {
  const ticker = stock.symbol.replace(/\.NS$/, '');
  const profile = await providerGet(`/stocks/${encodeURIComponent(ticker)}`);
  const price = profile.price ?? profile.current_price ?? stock.price ?? null;
  const previousClose = profile.previous_close ?? profile.prev_close ?? null;
  const change = Number.isFinite(price) && Number.isFinite(previousClose) ? price - previousClose : null;
  return {
    ...stock,
    ...profile,
    symbol: stock.symbol,
    name: profile.company_name || profile.name || stock.name,
    price,
    previousClose,
    change,
    changePct: profile.change_pct ?? (Number.isFinite(change) && previousClose ? change / previousClose * 100 : stock.changePct ?? null),
    dayHigh: profile.day_high ?? profile.high ?? null,
    dayLow: profile.day_low ?? profile.low ?? null,
    fiftyTwoWeekHigh: profile.high_52w ?? stock.fiftyTwoWeekHigh ?? null,
    fiftyTwoWeekLow: profile.low_52w ?? stock.fiftyTwoWeekLow ?? null,
    currency: 'INR',
    marketState: 'EOD'
  };
}

async function searchStocks(query) {
  const result = await providerGet(`/search?${new URLSearchParams({ q: query, limit: '12' })}`);
  const rows = Array.isArray(result) ? result : result.data || [];
  return rows.map(item => ({
    symbol: item.symbol,
    name: item.company_name || item.name || item.symbol,
    sector: item.sector || '—',
    exchange: item.exchange || 'NSE',
    currency: 'INR',
    type: 'EQUITY'
  }));
}

async function getHistory(symbol, range = '1mo') {
  const allowedRanges = new Set(['1d', '5d', '1mo', '6mo', '1y']);
  if (!allowedRanges.has(range)) range = '1mo';
  const days = ({ '1d': 1, '5d': 5, '1mo': 31, '6mo': 183, '1y': 365 })[range];
  const from = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const path = `/stocks/${encodeURIComponent(symbol.replace(/\.NS$/, ''))}/prices?${new URLSearchParams({ from, page: '1', page_size: '1000' })}`;
  const result = await providerGet(path);
  const rows = Array.isArray(result) ? result : result.data || [];
  return rows.map(row => ({ time: new Date(`${row.trade_date}T12:00:00Z`).getTime(), price: Number(row.adjusted_close ?? row.close), volume: (row.volume ?? row.volume_traded ?? row.total_traded_quantity) == null ? null : Number.isFinite(Number(row.volume ?? row.volume_traded ?? row.total_traded_quantity)) ? Number(row.volume ?? row.volume_traded ?? row.total_traded_quantity) : null }))
    .filter(point => Number.isFinite(point.price)).reverse();
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
    TotalRevenue: row.revenue ?? row.sales ?? null,
    QuarterlyExpenses: row.total_expenses ?? row.total_expense ?? row.expenses ?? (Number.isFinite(row.cost_of_revenue) && Number.isFinite(row.operating_expenses) ? row.cost_of_revenue + row.operating_expenses : null),
    CostOfRevenue: row.cost_of_revenue ?? (Number.isFinite(row.cost_of_materials_consumed) ? row.cost_of_materials_consumed + (Number.isFinite(row.purchases_of_stock_in_trade) ? row.purchases_of_stock_in_trade : 0) : null),
    GrossProfit: row.gross_profit ?? null,
    OperatingExpense: row.operating_expenses ?? null,
    OperatingIncome: row.operating_profit ?? row.operating_income ?? null,
    OtherIncome: row.other_income ?? null,
    InterestExpenseNonOperating: row.interest_expense ?? row.finance_costs ?? row.interest ?? null,
    Depreciation: row.depreciation ?? row.depreciation_and_amortisation ?? row.depreciation_and_amortization ?? null,
    PretaxIncome: row.profit_before_tax ?? row.pretax_income ?? null,
    TaxProvision: row.tax ?? row.tax_expense ?? null,
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
  const rows = Array.isArray(result) ? result : Array.isArray(result.data) ? result.data : result.as_on_date ? [result] : [];
  return rows.map(row => ({
    ...row,
    date: row.as_on_date || row.period_end_date || row.date || '',
    promoter_pct: row.promoter_pct ?? row.promoter_holding_pct ?? row.promoter_holding ?? null,
    fii_pct: row.fii_pct ?? row.fii_holding_pct ?? row.fii_holding ?? row.foreign_institutional_investors_pct ?? null,
    dii_pct: row.dii_pct ?? row.dii_holding_pct ?? row.dii_holding ?? row.domestic_institutional_investors_pct ?? null,
    public_pct: row.public_pct ?? row.public_holding_pct ?? row.public_holding ?? null,
    shareholder_count: row.shareholder_count ?? row.number_of_shareholders ?? row.total_shareholders ?? null
  })).sort((a, b) => a.date.localeCompare(b.date));
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

module.exports = { findStocks, findStock, getQuote, getQuotes, searchStocks, getHistory, getFundamentals, getRatios, getShareholding, getPeers, getCompanyAnnouncements, isConfigured: () => Boolean(process.env.BHARATSTOCK_API_KEY) };
