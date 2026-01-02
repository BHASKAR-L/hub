const Content = require('../models/Content');

// @desc    Get content
// @route   GET /api/content
// @access  Private
const getContent = async (req, res) => {
  try {
    const { platform, source_id, risk_level, limit = 50 } = req.query;
    
    const pipeline = [];
    const matchStage = {};

    if (platform) matchStage.platform = platform;
    if (source_id) matchStage.source_id = source_id;

    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    pipeline.push({ $sort: { published_at: -1 } });
    pipeline.push({ $limit: parseInt(limit) });
    
    pipeline.push({
      $lookup: {
        from: 'analyses',
        localField: 'id',
        foreignField: 'content_id',
        as: 'analysis'
      }
    });
    
    pipeline.push({
      $unwind: {
        path: '$analysis',
        preserveNullAndEmptyArrays: true
      }
    });

    pipeline.push({ $project: { _id: 0, __v: 0, 'analysis._id': 0, 'analysis.__v': 0 } });

    if (risk_level) {
      pipeline.push({ $match: { 'analysis.risk_level': risk_level } });
    }

    const contentList = await Content.aggregate(pipeline);
    res.status(200).json(contentList);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get content detail
// @route   GET /api/content/:id
// @access  Private
const getContentDetail = async (req, res) => {
  try {
    const pipeline = [
      { $match: { id: req.params.id } },
      {
        $lookup: {
          from: 'analyses',
          localField: 'id',
          foreignField: 'content_id',
          as: 'analysis'
        }
      },
      {
        $unwind: {
          path: '$analysis',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'sources',
          localField: 'source_id',
          foreignField: 'id',
          as: 'source'
        }
      },
      {
        $unwind: {
          path: '$source',
          preserveNullAndEmptyArrays: true
        }
      },
      { $project: { _id: 0, __v: 0, 'analysis._id': 0, 'analysis.__v': 0, 'source._id': 0, 'source.__v': 0 } }
    ];

    const result = await Content.aggregate(pipeline);

    if (!result || result.length === 0) {
      return res.status(404).json({ message: 'Content not found' });
    }

    res.status(200).json(result[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getContent,
  getContentDetail
};
