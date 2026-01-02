const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const analysisSchema = new mongoose.Schema({
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
  violence_score: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  threat_score: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  hate_score: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  sentiment: {
    type: String,
    enum: ['positive', 'neutral', 'negative'],
    required: true
  },
  risk_level: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH'],
    required: true
  },
  triggered_keywords: [{
    type: String
  }],
  explanation: {
    type: String
  },
  analyzed_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Analysis', analysisSchema);
