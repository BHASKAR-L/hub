const Source = require('../models/Source');
const Content = require('../models/Content');
const Alert = require('../models/Alert');

// @desc    Get analytics overview
// @route   GET /api/analytics/overview
// @access  Private
const getAnalyticsOverview = async (req, res) => {
  try {
    const totalSources = await Source.countDocuments({});
    const activeSources = await Source.countDocuments({ is_active: true });
    const totalContent = await Content.countDocuments({});
    const activeAlerts = await Alert.countDocuments({ status: 'active' });
    const totalAlerts = await Alert.countDocuments({});

    const riskDist = await Content.aggregate([
      {
        $lookup: {
          from: 'analyses',
          localField: 'id',
          foreignField: 'content_id',
          as: 'analysis'
        }
      },
      { $unwind: '$analysis' },
      {
        $group: {
          _id: '$analysis.risk_level',
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      total_sources: totalSources,
      active_sources: activeSources,
      total_content: totalContent,
      active_alerts: activeAlerts,
      total_alerts: totalAlerts,
      risk_distribution: riskDist
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get trends
// @route   GET /api/analytics/trends
// @access  Private
const getTrends = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const contentTrend = await Content.aggregate([
      { $match: { created_at: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$created_at" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const alertTrend = await Alert.aggregate([
      { $match: { created_at: { $gte: startDate } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$created_at" } },
            risk_level: "$risk_level"
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.date": 1 } }
    ]);

    res.status(200).json({
      content_trend: contentTrend,
      alert_trend: alertTrend
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAnalyticsOverview,
  getTrends
};
