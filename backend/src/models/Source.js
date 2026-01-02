const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const sourceSchema = new mongoose.Schema({
  id: {
    type: String,
    default: uuidv4,
    unique: true
  },
  platform: {
    type: String,
    enum: ['youtube', 'x', 'instagram', 'facebook'],
    required: true
  },
  identifier: {
    type: String,
    required: true
  },
  display_name: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['news', 'influencer', 'political', 'unknown'],
    default: 'unknown'
  },
  is_active: {
    type: Boolean,
    default: true
  },
  created_by: {
    type: String,
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  last_checked: {
    type: Date
  }
});

// Compound index to prevent duplicates
sourceSchema.index({ platform: 1, identifier: 1 }, { unique: true });

module.exports = mongoose.model('Source', sourceSchema);
