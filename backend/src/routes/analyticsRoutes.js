const express = require('express');
const router = express.Router();
const { getAnalyticsOverview, getTrends } = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');

router.get('/overview', protect, getAnalyticsOverview);
router.get('/trends', protect, getTrends);

module.exports = router;
