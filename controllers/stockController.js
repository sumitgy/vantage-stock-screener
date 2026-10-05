const stockModel = require('../models/stockModel');

async function listStocks(req, res, next) {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, Number.parseInt(req.query.pageSize, 10) || 20));
    const selected = await stockModel.findStocks({
      query: req.query.q || '',
      exchange: req.query.exchange || 'All',
      page,
      pageSize
    });
    const data = await stockModel.getQuotes(selected.data);
    const errors = data.filter(stock => stock.quoteError).map(stock => ({ symbol: stock.symbol, message: stock.quoteError }));
    res.json({ data, errors, total: selected.total, page: selected.page, pageSize: selected.pageSize, updatedAt: Date.now(), provider: 'BharatStock' });
  } catch (error) {
    next(error);
  }
}

async function searchStocks(req, res, next) {
  try {
    const query = (req.query.q || '').trim();
    if (!query) return res.json({ data: [] });
    res.json({ data: await stockModel.searchStocks(query), provider: 'BharatStock' });
  } catch (error) {
    next(error);
  }
}

async function getQuote(req, res, next) {
  try {
    const symbol = req.params.symbol.toUpperCase();
    if (!/^[A-Z0-9.\-&^=]{1,24}$/.test(symbol)) {
      return res.status(400).json({ error: 'Invalid ticker symbol' });
    }
    const stock = stockModel.findStock(symbol) || { symbol, name: symbol, sector: '—' };
    res.json({ data: await stockModel.getQuote(stock), provider: 'BharatStock' });
  } catch (error) {
    next(error);
  }
}

async function getHistory(req, res, next) {
  try {
    const symbol = req.params.symbol.toUpperCase();
    if (!/^[A-Z0-9.\-&^=]{1,24}$/.test(symbol)) {
      return res.status(400).json({ error: 'Invalid ticker symbol' });
    }
    const range = req.query.range || '1mo';
    const data = await stockModel.getHistory(symbol, range);
    res.json({ symbol, range, data });
  } catch (error) {
    next(error);
  }
}

async function getFundamentals(req, res, next) {
  try {
    const symbol = req.params.symbol.toUpperCase();
    if (!/^[A-Z0-9.\-&]{1,24}$/.test(symbol)) {
      return res.status(400).json({ error: 'Invalid ticker symbol' });
    }
    const period = req.query.period === 'quarterly' ? 'quarterly' : 'annual';
    const data = await stockModel.getFundamentals(symbol, period);
    res.json({ symbol, period, data, provider: 'BharatStock' });
  } catch (error) {
    next(error);
  }
}

async function getRatios(req, res, next) {
  try {
    const symbol = req.params.symbol.toUpperCase();
    if (!/^[A-Z0-9.\-&]{1,24}$/.test(symbol)) return res.status(400).json({ error: 'Invalid ticker symbol' });
    res.json({ symbol, data: await stockModel.getRatios(symbol), provider: 'BharatStock' });
  } catch (error) {
    next(error);
  }
}

async function getShareholding(req, res, next) {
  try {
    const symbol = req.params.symbol.toUpperCase();
    if (!/^[A-Z0-9.\-&]{1,24}$/.test(symbol)) return res.status(400).json({ error: 'Invalid ticker symbol' });
    res.json({ symbol, data: await stockModel.getShareholding(symbol), provider: 'BharatStock' });
  } catch (error) {
    next(error);
  }
}

async function getPeers(req, res, next) {
  try {
    const symbol = req.params.symbol.toUpperCase();
    if (!/^[A-Z0-9.\-&]{1,24}$/.test(symbol)) return res.status(400).json({ error: 'Invalid ticker symbol' });
    res.json({ symbol, ...(await stockModel.getPeers(symbol)), provider: 'BharatStock' });
  } catch (error) {
    next(error);
  }
}

async function getCompanyAnnouncements(req, res, next) {
  try {
    const symbol = req.params.symbol.toUpperCase();
    if (!/^[A-Z0-9.\-&]{1,24}$/.test(symbol)) {
      return res.status(400).json({ error: 'Invalid ticker symbol' });
    }
    const data = await stockModel.getCompanyAnnouncements(symbol);
    res.json({ symbol, data, provider: 'NSE India' });
  } catch (error) {
    next(error);
  }
}

function healthCheck(_req, res) {
  const configured = stockModel.isConfigured();
  res.status(configured ? 200 : 503).json({ ok: configured, provider: 'BharatStock', configured });
}

module.exports = { listStocks, searchStocks, getQuote, getHistory, getFundamentals, getRatios, getShareholding, getPeers, getCompanyAnnouncements, healthCheck };
