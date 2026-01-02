const Alert = require('../models/Alert');
const { createAuditLog } = require('../services/auditService');

// @desc    Get alerts
// @route   GET /api/alerts
// @access  Private
const getAlerts = async (req, res) => {
  try {
    const { status, risk_level } = req.query;
    const query = {};

    if (status) query.status = status;
    if (risk_level) query.risk_level = risk_level;

    const alerts = await Alert.find(query).sort({ created_at: -1 }).limit(100);
    res.status(200).json(alerts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update alert
// @route   PUT /api/alerts/:id
// @access  Private
const updateAlert = async (req, res) => {
  try {
    const { status, notes } = req.body;
    const alert = await Alert.findOne({ id: req.params.id });

    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    const updateDoc = {
      status,
      acknowledged_by: req.user.id,
      acknowledged_at: new Date()
    };

    if (notes) updateDoc.notes = notes;

    const updatedAlert = await Alert.findOneAndUpdate(
      { id: req.params.id },
      updateDoc,
      { new: true }
    );

    await createAuditLog(req.user, 'update', 'alert', req.params.id, { status });

    res.status(200).json(updatedAlert);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get alert stats
// @route   GET /api/alerts/stats
// @access  Private
const getAlertStats = async (req, res) => {
  try {
    const stats = await Alert.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    res.status(200).json({ stats });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAlerts,
  updateAlert,
  getAlertStats
};
