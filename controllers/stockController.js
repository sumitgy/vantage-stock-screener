const stockModel = require('../models/stockModel');

async function listStocks(req, res, next) {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(req.query.pageSize, 10) || 20));
    const selected = await stockModel.findStocks({
      query: req.query.q || '',
      exchange: req.query.exchange || 'All',
      page,
      pageSize
    });
    const settled = await Promise.allSettled(selected.data.map(stockModel.getQuote));
    const data = selected.data.map((stock, index) => settled[index].status === 'fulfilled'
      ? settled[index].value
      : { ...stock, price: null, previousClose: null, change: null, changePct: null, volume: null, marketState: 'UNKNOWN', quoteError: settled[index].reason.message });
    const errors = settled.map((result, index) => result.status === 'rejected'
      ? { symbol: selected.data[index]?.symbol, message: result.reason.message }
      : null).filter(Boolean);
    res.json({ data, errors, total: selected.total, page: selected.page, pageSize: selected.pageSize, updatedAt: Date.now(), provider: 'Yahoo Finance' });
  } catch (error) {
    next(error);
  }
}

async function searchStocks(req, res, next) {
  try {
    const query = (req.query.q || '').trim();
    if (!query) return res.json({ data: [] });
    res.json({ data: await stockModel.searchStocks(query), provider: 'Yahoo Finance' });
  } catch (error) {
    next(error);
  }
}

async function getQuote(req, res, next) {
  try {
    const symbol = req.params.symbol.toUpperCase();
    if (!/^[A-Z0-9.\-^=]{1,24}$/.test(symbol)) {
      return res.status(400).json({ error: 'Invalid ticker symbol' });
    }
    const stock = stockModel.findStock(symbol) || { symbol, name: symbol, sector: '—' };
    res.json({ data: await stockModel.getQuote(stock), provider: 'Yahoo Finance' });
  } catch (error) {
    next(error);
  }
}

async function getHistory(req, res, next) {
  try {
    const symbol = req.params.symbol.toUpperCase();
    if (!/^[A-Z.\-^=]{1,15}$/.test(symbol)) {
      return res.status(400).json({ error: 'Invalid ticker symbol' });
    }
    const range = req.query.range || '1mo';
    const data = await stockModel.getHistory(symbol, range);
    res.json({ symbol, range, data });
  } catch (error) {
    next(error);
  }
}

function healthCheck(_req, res) {
  res.json({ ok: true, provider: 'Yahoo Finance' });
}

module.exports = { listStocks, searchStocks, getQuote, getHistory, healthCheck };
