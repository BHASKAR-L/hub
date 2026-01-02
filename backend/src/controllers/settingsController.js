const Settings = require('../models/Settings');
const { createAuditLog } = require('../services/auditService');

// @desc    Get settings
// @route   GET /api/settings
// @access  Private
const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne({ id: 'global_settings' });

    if (!settings) {
      settings = await Settings.create({ id: 'global_settings' });
    }

    res.status(200).json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update settings
// @route   PUT /api/settings
// @access  Private (Admin/Analyst only)
const updateSettings = async (req, res) => {
  try {
    if (!['super_admin', 'analyst'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const updateDoc = { ...req.body, updated_at: new Date() };

    const settings = await Settings.findOneAndUpdate(
      { id: 'global_settings' },
      updateDoc,
      { new: true, upsert: true }
    );

    await createAuditLog(req.user, 'update', 'settings', 'global_settings', updateDoc);

    res.status(200).json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getSettings,
  updateSettings
};
