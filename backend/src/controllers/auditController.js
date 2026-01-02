const AuditLog = require('../models/AuditLog');

// @desc    Get audit logs
// @route   GET /api/audit
// @access  Private
const getAuditLogs = async (req, res) => {
  try {
    const { limit = 100, resource_type } = req.query;
    const query = {};

    if (resource_type) query.resource_type = resource_type;

    const logs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    res.status(200).json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAuditLogs
};
