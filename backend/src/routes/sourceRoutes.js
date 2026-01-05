const express = require('express');
const router = express.Router();
const { getSources, createSource, updateSource, deleteSource, manualCheck } = require('../controllers/sourceController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getSources)
  .post(protect, createSource);

router.route('/:id')
  .put(protect, updateSource)
  .delete(protect, deleteSource);

router.post('/:id/check', protect, manualCheck);

module.exports = router;
