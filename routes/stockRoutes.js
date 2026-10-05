const express = require('express');
const stockController = require('../controllers/stockController');

const router = express.Router();

router.get('/stocks', stockController.listStocks);
router.get('/search', stockController.searchStocks);
router.get('/quote/:symbol', stockController.getQuote);
router.get('/history/:symbol', stockController.getHistory);
router.get('/fundamentals/:symbol', stockController.getFundamentals);
router.get('/ratios/:symbol', stockController.getRatios);
router.get('/shareholding/:symbol', stockController.getShareholding);
router.get('/peers/:symbol', stockController.getPeers);
router.get('/announcements/:symbol', stockController.getCompanyAnnouncements);
router.get('/health', stockController.healthCheck);


module.exports = router;
