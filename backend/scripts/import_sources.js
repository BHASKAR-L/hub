require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const { google } = require('googleapis');
const Source = require('../src/models/Source');

const sourcesToImport = [
  { handle: '@ABUFAISALNEWS', name: 'ABU FAISAL NEWS', category: 'political' },
  { handle: '@Ahnewshyderabad', name: 'A H-NEWS', category: 'political' },
  { handle: '@Sharedeccan786', name: 'Sher E Deccan', category: 'political' },
  { handle: '@universalboyfarhan3214', name: 'Universal Boy Farhan', category: 'news' },
  { handle: '@HydBasNaamHiKafiHai', name: 'Hyd Bas Naam Hi Kafi Hai', category: 'political' },
  { handle: '@hameedakhatoon956', name: 'Hameeda Khatoon Family Vlogs', category: 'news' }
];

const importSources = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const youtube = google.youtube({
      version: 'v3',
      auth: process.env.YOUTUBE_API_KEY
    });

    for (const source of sourcesToImport) {
      console.log(`Processing ${source.name} (${source.handle})...`);
      
      try {
        // Search for the channel by handle
        const response = await youtube.search.list({
          part: 'snippet',
          q: source.handle,
          type: 'channel',
          maxResults: 1
        });

        if (response.data.items && response.data.items.length > 0) {
          const channelId = response.data.items[0].id.channelId;
          const channelTitle = response.data.items[0].snippet.title;
          console.log(`Found channel: ${channelTitle} (${channelId})`);

          // Check if already exists
          const existing = await Source.findOne({ platform: 'youtube', identifier: channelId });
          if (existing) {
            console.log(`Source already exists: ${existing.display_name}`);
            continue;
          }

          // Create new source
          await Source.create({
            platform: 'youtube',
            identifier: channelId,
            display_name: source.name, // Use the name from the list or channelTitle
            category: source.category,
            created_by: 'system_import',
            is_active: true
          });
          console.log(`Imported source: ${source.name}`);
        } else {
          console.warn(`Could not find channel for handle: ${source.handle}`);
          // Fallback: Try to insert with handle as identifier if search fails? 
          // No, monitor service needs channel ID.
        }
      } catch (err) {
        console.error(`Error processing ${source.handle}:`, err.message);
      }
    }

    console.log('Import completed');
    process.exit(0);
  } catch (error) {
    console.error('Script failed:', error);
    process.exit(1);
  }
};

importSources();
