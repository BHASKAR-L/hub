const express = require('express');
const router = express.Router();
const { getContent, getContentDetail } = require('../controllers/contentController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getContent);
router.get('/:id', protect, getContentDetail);

module.exports = router;
