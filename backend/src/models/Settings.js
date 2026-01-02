const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  id: {
    type: String,
    default: 'global_settings',
    unique: true
  },
  high_risk_threshold: {
    type: Number,
    default: 70
  },
  medium_risk_threshold: {
    type: Number,
    default: 40
  },
  enable_email_alerts: {
    type: Boolean,
    default: true
  },
  alert_emails: [{
    type: String
  }],
  youtube_api_key: { type: String },
  x_bearer_token: { type: String },
  facebook_access_token: { type: String },
  smtp_config: {
    host: { type: String },
    port: { type: Number },
    username: { type: String },
    password: { type: String }
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Settings', settingsSchema);
