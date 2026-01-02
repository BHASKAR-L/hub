const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const alertSchema = new mongoose.Schema({
  id: {
    type: String,
    default: uuidv4,
    unique: true
  },
  content_id: {
    type: String,
    required: true,
    ref: 'Content'
  },
  analysis_id: {
    type: String,
    required: true,
    ref: 'Analysis'
  },
  risk_level: {
    type: String,
    enum: ['MEDIUM', 'HIGH'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  content_url: {
    type: String,
    required: true
  },
  platform: {
    type: String,
    enum: ['youtube', 'x'],
    required: true
  },
  author: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'acknowledged', 'resolved', 'false_positive'],
    default: 'active'
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  acknowledged_by: {
    type: String,
    ref: 'User'
  },
  acknowledged_at: {
    type: Date
  },
  notes: {
    type: String
  }
});

module.exports = mongoose.model('Alert', alertSchema);
