const Source = require('../models/Source');
const { createAuditLog } = require('../services/auditService');

// @desc    Get sources
// @route   GET /api/sources
// @access  Private
const getSources = async (req, res) => {
  try {
    const { platform, is_active } = req.query;
    const query = {};

    if (platform) query.platform = platform;
    if (is_active !== undefined) query.is_active = is_active === 'true';

    const sources = await Source.find(query).limit(1000);
    res.status(200).json(sources);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create source
// @route   POST /api/sources
// @access  Private
const createSource = async (req, res) => {
  try {
    const { platform, identifier, display_name, category } = req.body;

    const existing = await Source.findOne({ platform, identifier });
    if (existing) {
      return res.status(400).json({ message: 'Source already exists' });
    }

    const source = await Source.create({
      platform,
      identifier,
      display_name,
      category,
      created_by: req.user.id
    });

    await createAuditLog(req.user, 'create', 'source', source.id, { display_name });

    res.status(201).json(source);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update source
// @route   PUT /api/sources/:id
// @access  Private
const updateSource = async (req, res) => {
  try {
    const source = await Source.findOne({ id: req.params.id });

    if (!source) {
      return res.status(404).json({ message: 'Source not found' });
    }

    const updatedSource = await Source.findOneAndUpdate(
      { id: req.params.id },
      req.body,
      { new: true }
    );

    await createAuditLog(req.user, 'update', 'source', req.params.id, req.body);

    res.status(200).json(updatedSource);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete source
// @route   DELETE /api/sources/:id
// @access  Private
const deleteSource = async (req, res) => {
  try {
    const source = await Source.findOne({ id: req.params.id });

    if (!source) {
      return res.status(404).json({ message: 'Source not found' });
    }

    await source.deleteOne();
    await createAuditLog(req.user, 'delete', 'source', req.params.id, {});

    res.status(204).json(null);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Manual check source
// @route   POST /api/sources/:id/check
// @access  Private
const manualCheck = async (req, res) => {
  try {
    const source = await Source.findOne({ id: req.params.id });

    if (!source) {
      return res.status(404).json({ message: 'Source not found' });
    }

    // Simulate check logic or call a service
    source.last_checked = new Date();
    await source.save();

    await createAuditLog(req.user, 'manual_check', 'source', req.params.id, { 
      display_name: source.display_name,
      status: 'checked'
    });

    res.status(200).json({ message: 'Manual check initiated', source });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getSources,
  createSource,
  updateSource,
  deleteSource,
  manualCheck
};
