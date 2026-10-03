const apiDocs = require('../models/apiDocsModel');

function getApiDocs(_req, res) {
  res.json(apiDocs);
}

module.exports = { getApiDocs };
