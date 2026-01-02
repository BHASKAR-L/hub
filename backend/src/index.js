require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { startMonitoring } = require('./services/monitorService');
const User = require('./models/User');
const Settings = require('./models/Settings');
const Source = require('./models/Source');
const Content = require('./models/Content');
const { google } = require('googleapis');
const bcrypt = require('bcryptjs');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : '*',
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/sources', require('./routes/sourceRoutes'));
app.use('/api/content', require('./routes/contentRoutes'));
app.use('/api/alerts', require('./routes/alertRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/keywords', require('./routes/keywordRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));
app.use('/api/audit', require('./routes/auditRoutes'));

// Default Admin User
const createDefaultAdmin = async () => {
  try {
    const adminEmail = 'admin@blurahub.com';
    const adminExists = await User.findOne({ email: adminEmail });

    if (!adminExists) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);

      await User.create({
        email: adminEmail,
        password: hashedPassword,
        full_name: 'System Administrator',
        role: 'super_admin'
      });
      console.log('Default admin user created: admin@blurahub.com / admin123');
    }
  } catch (error) {
    console.error(`Error creating default admin: ${error.message}`);
  }
};

// Default Settings
const createDefaultSettings = async () => {
  try {
    const settings = await Settings.findOne({ id: 'global_settings' });
    if (!settings) {
      await Settings.create({
        id: 'global_settings',
        high_risk_threshold: 70,
        medium_risk_threshold: 40,
        enable_email_alerts: true
      });
      console.log('Default settings created');
    }
  } catch (error) {
    console.error(`Error creating default settings: ${error.message}`);
  }
};

const seedSources = async () => {
  try {
    const sourcesList = require('./data/sources_list.json');
    const apiKey = process.env.YOUTUBE_API_KEY;
    const youtube = apiKey ? google.youtube({ version: 'v3', auth: apiKey }) : null;

    console.log(`Seeding ${sourcesList.length} sources...`);

    for (const source of sourcesList) {
      // Check if exists by identifier or display name
      const existing = await Source.findOne({ 
        $or: [
          { identifier: source.identifier },
          { display_name: source.display_name, platform: source.platform }
        ]
      });
      
      if (existing) continue;

      let identifier = source.identifier;

      // Resolve YouTube handle to Channel ID if needed
      if (source.platform === 'youtube' && identifier.startsWith('@') && youtube) {
        try {
          const response = await youtube.search.list({
            part: 'snippet',
            q: identifier,
            type: 'channel',
            maxResults: 1
          });

          if (response.data.items && response.data.items.length > 0) {
            identifier = response.data.items[0].id.channelId;
            console.log(`Resolved ${source.identifier} to ${identifier}`);
          } else {
            console.warn(`Could not resolve YouTube handle: ${source.identifier}`);
            // Skip or insert with handle? Insert with handle and let monitor fail/retry?
            // Better to skip if we can't get ID, as monitor needs ID.
            // But maybe the handle IS the ID (unlikely with @).
            // We'll insert it anyway, maybe monitor can resolve later or user can fix.
          }
        } catch (err) {
          console.error(`Error resolving ${source.identifier}: ${err.message}`);
        }
      }

      try {
        await Source.create({
          platform: source.platform,
          identifier: identifier,
          display_name: source.display_name,
          category: source.category,
          created_by: 'system_seed',
          is_active: true
        });
        console.log(`Seeded source: ${source.display_name} (${source.platform})`);
      } catch (err) {
        if (err.code !== 11000) { // Ignore duplicate key errors
          console.error(`Failed to seed ${source.display_name}: ${err.message}`);
        }
      }
    }
    console.log('Seeding completed.');
  } catch (error) {
    console.error('Error seeding sources:', error);
  }
};

const fixIndexes = async () => {
  try {
    const indexes = await Content.collection.indexes();
    const keyIndex = indexes.find(idx => idx.name === 'key_1');
    if (keyIndex) {
      console.log('Dropping invalid index key_1 from contents collection...');
      await Content.collection.dropIndex('key_1');
      console.log('Index dropped.');
    }
  } catch (error) {
    if (error.code !== 27) {
      console.error('Error fixing indexes:', error.message);
    }
  }
};

const startServer = async () => {
  // Connect to database
  await connectDB();

  // Create default admin
  await createDefaultAdmin();

  // Create default settings
  await createDefaultSettings();

  // Seed sources
  await seedSources();

  // Fix indexes
  await fixIndexes();

  // Start Monitoring Service
  startMonitoring();

  const PORT = process.env.PORT || 8000;

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
