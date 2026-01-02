const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const keywordSchema = new mongoose.Schema({
  id: {
    type: String,
    default: uuidv4,
    unique: true
  },
  keyword: {
    type: String,
    required: true,
    unique: true
  },
  category: {
    type: String,
    enum: ['violence', 'threat', 'hate', 'other'],
    required: true
  },
  weight: {
    type: Number,
    default: 10
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Keyword', keywordSchema);
