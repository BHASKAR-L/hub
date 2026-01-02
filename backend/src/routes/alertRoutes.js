const express = require('express');
const router = express.Router();
const { getAlerts, updateAlert, getAlertStats } = require('../controllers/alertController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getAlerts);
router.get('/stats', protect, getAlertStats);
router.put('/:id', protect, updateAlert);

module.exports = router;
