const express = require('express');
const path = require('node:path');
const stockRoutes = require('./routes/stockRoutes');
const apiDocsRoutes = require('./routes/apiDocsRoutes');

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.disable('x-powered-by');

// Render health check
app.get('/healthz', (_req, res) => {
  res.status(200).send('OK');
});

app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

app.use('/api', apiDocsRoutes);
app.use('/api', stockRoutes);

app.use(express.static(path.join(__dirname, 'views')));

app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }

  res.status(404).send('Not found');
});

app.use((error, _req, res, _next) => {
  res.status(502).json({
    error: error.message || 'Market data unavailable'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Vantage Screener running at http://localhost:${PORT}`);
});