const express = require('express');
const apiDocsController = require('../controllers/apiDocsController');

const router = express.Router();

router.get('/docs', apiDocsController.getApiDocs);

module.exports = router;
