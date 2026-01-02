const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const contentSchema = new mongoose.Schema({
  id: {
    type: String,
    default: uuidv4,
    unique: true
  },
  source_id: {
    type: String,
    required: true,
    ref: 'Source'
  },
  platform: {
    type: String,
    enum: ['youtube', 'x', 'instagram', 'facebook'],
    required: true
  },
  content_id: {
    type: String,
    required: true
  },
  content_url: {
    type: String,
    required: true
  },
  text: {
    type: String,
    required: true
  },
  author: {
    type: String,
    required: true
  },
  author_handle: {
    type: String,
    required: true
  },
  published_at: {
    type: Date,
    required: true
  },
  engagement: {
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    retweets: { type: Number, default: 0 }
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

contentSchema.index({ content_id: 1 }, { unique: true });

module.exports = mongoose.model('Content', contentSchema);
