const express = require('express');
const stockController = require('../controllers/stockController');

const router = express.Router();

router.get('/stocks', stockController.listStocks);
router.get('/search', stockController.searchStocks);
router.get('/quote/:symbol', stockController.getQuote);
router.get('/history/:symbol', stockController.getHistory);
router.get('/health', stockController.healthCheck);


module.exports = router;
