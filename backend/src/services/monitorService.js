const { google } = require('googleapis');
const { TwitterApi } = require('twitter-api-v2');
const Source = require('../models/Source');
const Content = require('../models/Content');
const Analysis = require('../models/Analysis');
const Alert = require('../models/Alert');
const Settings = require('../models/Settings');
const { analyzeContent } = require('./analysisService');
const { sendAlertEmail } = require('./emailService');

// Helper to extract and fetch URL content
const extractAndFetchUrlContent = async (text) => {
  try {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = text.match(urlRegex);
    
    if (!urls || urls.length === 0) return '';

    let scrapedText = '';
    
    // Limit to first 2 URLs to avoid timeout/spam
    for (const url of urls.slice(0, 2)) {
      try {
        // Skip internal or known media URLs if needed
        if (url.includes('youtube.com') || url.includes('twitter.com') || url.includes('x.com')) continue;

        const response = await fetch(url, { signal: AbortSignal.timeout(5000) }); // 5s timeout
        if (!response.ok) continue;
        
        const html = await response.text();
        
        // Simple regex extraction
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : '';
        
        const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i) ||
                          html.match(/<meta\s+content=["']([^"']+)["']\s+name=["']description["']/i);
        const description = descMatch ? descMatch[1].trim() : '';

        if (title || description) {
          scrapedText += ` [Link Content: ${title} - ${description}]`;
        }
      } catch (err) {
        // Ignore fetch errors
        console.log(`Failed to fetch URL ${url}: ${err.message}`);
      }
    }
    return scrapedText;
  } catch (error) {
    console.error('Error in URL extraction:', error);
    return '';
  }
};

const monitorYoutubeSource = async (source, apiKey) => {
  try {
    const youtube = google.youtube({
      version: 'v3',
      auth: apiKey
    });

    // Get latest videos
    const response = await youtube.search.list({
      part: 'snippet',
      channelId: source.identifier,
      order: 'date',
      maxResults: 10,
      type: 'video'
    });

    const newContent = [];
    const items = response.data.items || [];

    for (const item of items) {
      const videoId = item.id.videoId;

      // Check if exists
      const existing = await Content.findOne({ content_id: videoId });
      if (existing) continue;

      // Get video details
      const videoResponse = await youtube.videos.list({
        part: 'snippet,statistics',
        id: videoId
      });

      if (!videoResponse.data.items || videoResponse.data.items.length === 0) continue;

      const videoData = videoResponse.data.items[0];
      const snippet = videoData.snippet;
      const stats = videoData.statistics;

      const baseText = `${snippet.title} ${snippet.description}`;
      const scrapedContent = await extractAndFetchUrlContent(baseText);

      const content = new Content({
        source_id: source.id,
        platform: 'youtube',
        content_id: videoId,
        content_url: `https://www.youtube.com/watch?v=${videoId}`,
        text: baseText + scrapedContent,
        scraped_content: scrapedContent,
        author: snippet.channelTitle,
        author_handle: source.identifier,
        published_at: new Date(snippet.publishedAt),
        engagement: {
          views: parseInt(stats.viewCount || 0),
          likes: parseInt(stats.likeCount || 0),
          comments: parseInt(stats.commentCount || 0)
        }
      });

      await content.save();
      newContent.push(content);
      console.log(`New YouTube video: ${videoId} from ${source.display_name}`);
    }

    // Update last checked
    await Source.findOneAndUpdate({ id: source.id }, { last_checked: new Date() });

    return newContent;
  } catch (error) {
    console.error(`Error monitoring YouTube source ${source.display_name}: ${error.message}`);
    return [];
  }
};

const monitorXSource = async (source, bearerToken) => {
  try {
    const client = new TwitterApi(bearerToken);
    const roClient = client.readOnly;

    // Get user by username
    const user = await roClient.v2.userByUsername(source.identifier);
    if (!user.data) {
      console.error(`X user not found: ${source.identifier}`);
      return [];
    }

    const userId = user.data.id;

    // Get latest tweets
    const tweets = await roClient.v2.userTimeline(userId, {
      max_results: 10,
      'tweet.fields': ['created_at', 'public_metrics', 'text'],
      exclude: ['retweets', 'replies']
    });

    if (!tweets.data || tweets.data.length === 0) return [];

    const newContent = [];

    for (const tweet of tweets.data) {
      const tweetId = tweet.id;

      // Check if exists
      const existing = await Content.findOne({ content_id: tweetId });
      if (existing) continue;

      const scrapedContent = await extractAndFetchUrlContent(tweet.text);

      const content = new Content({
        source_id: source.id,
        platform: 'x',
        content_id: tweetId,
        content_url: `https://x.com/${source.identifier}/status/${tweetId}`,
        text: tweet.text + scrapedContent,
        scraped_content: scrapedContent,
        author: source.display_name,
        author_handle: source.identifier,
        published_at: new Date(tweet.created_at),
        engagement: {
          likes: tweet.public_metrics.like_count,
          retweets: tweet.public_metrics.retweet_count,
          replies: tweet.public_metrics.reply_count,
          views: tweet.public_metrics.impression_count || 0
        }
      });

      await content.save();
      newContent.push(content);
      console.log(`New X post: ${tweetId} from ${source.display_name}`);
    }

    // Update last checked
    await Source.findOneAndUpdate({ id: source.id }, { last_checked: new Date() });

    return newContent;
  } catch (error) {
    console.error(`Error monitoring X source ${source.display_name}: ${error.message}`);
    return [];
  }
};

const monitorInstagramSource = async (source, accessToken) => {
  // Placeholder for Instagram Graph API integration
  // Requires: Facebook Developer Account, Instagram Business Account linked to FB Page
  console.log(`Checking Instagram source: ${source.display_name} (Mock)`);
  return [];
};

const monitorFacebookSource = async (source, accessToken) => {
  // Placeholder for Facebook Graph API integration
  console.log(`Checking Facebook source: ${source.display_name} (Mock)`);
  return [];
};

const analyzeAndAlert = async (content, settings) => {
  try {
    const analysisData = analyzeContent(
      content.text,
      settings.high_risk_threshold || 70,
      settings.medium_risk_threshold || 40
    );

    const analysis = new Analysis({
      content_id: content.id,
      ...analysisData
    });

    await analysis.save();

    if (['MEDIUM', 'HIGH'].includes(analysis.risk_level)) {
      const alert = new Alert({
        content_id: content.id,
        analysis_id: analysis.id,
        risk_level: analysis.risk_level,
        title: `${analysis.risk_level} Risk: ${content.author}`,
        description: analysis.explanation,
        content_url: content.content_url,
        platform: content.platform,
        author: content.author
      });

      await alert.save();
      console.log(`Alert created: ${alert.id} - ${alert.title}`);

      if (settings.enable_email_alerts && settings.alert_emails && settings.alert_emails.length > 0) {
        const alertData = {
          risk_level: alert.risk_level,
          platform: alert.platform,
          author: alert.author,
          content_url: alert.content_url,
          description: alert.description,
          triggered_keywords: analysis.triggered_keywords,
          created_at: new Date().toISOString()
        };

        await sendAlertEmail(settings.smtp_config, settings.alert_emails, alertData);
      }
    }
  } catch (error) {
    console.error(`Error analyzing content ${content.id}: ${error.message}`);
  }
};

const startMonitoring = async () => {
  console.log("Starting monitoring loop...");

  const runLoop = async () => {
    try {
      const settings = await Settings.findOne({ id: 'global_settings' });
      if (!settings) {
        console.log("Settings not found, waiting...");
        setTimeout(runLoop, 60000);
        return;
      }

      // In a real app, these keys should probably be in .env or securely stored in DB
      // For this port, I'll assume they are in process.env as per the Python code using os.environ/settings
      // The Python code fetched them from settings, but settings model didn't have them explicitly defined in the schema I saw earlier?
      // Wait, the Python `Settings` model in `models.py` didn't have `youtube_api_key` or `x_bearer_token`.
      // But `monitor_service.py` tried to get them from `settings`.
      // I'll assume they are in environment variables for now as that's safer, or I should add them to the Settings model.
      // The Python code: `youtube_api_key = settings.get('youtube_api_key', '')` implies they are in the settings dict.
      // But `models.py` `Settings` class didn't show them. Maybe `extra="ignore"` was used but they were stored in DB?
      const youtubeApiKey = settings.youtube_api_key || process.env.YOUTUBE_API_KEY;
      const xBearerToken = settings.x_bearer_token || process.env.X_BEARER_TOKEN;
      const fbAccessToken = settings.facebook_access_token || process.env.FACEBOOK_ACCESS_TOKEN;

      if (!youtubeApiKey && !xBearerToken && !fbAccessToken) {
        console.warn("No API keys configured (DB or ENV). Waiting...");
        setTimeout(runLoop, 60000);
        return;
      }

      const sources = await Source.find({ is_active: true });
      
      if (sources.length === 0) {
        console.log("No active sources to monitor");
        setTimeout(runLoop, 60000);
        return;
      }

      console.log(`Monitoring ${sources.length} sources...`);

      for (const source of sources) {
        let newContent = [];
        if (source.platform === 'youtube' && youtubeApiKey) {
          newContent = await monitorYoutubeSource(source, youtubeApiKey);
        } else if (source.platform === 'x' && xBearerToken) {
          newContent = await monitorXSource(source, xBearerToken);
        } else if (source.platform === 'instagram') {
          newContent = await monitorInstagramSource(source, fbAccessToken);
        } else if (source.platform === 'facebook') {
          newContent = await monitorFacebookSource(source, fbAccessToken);
        }

        for (const content of newContent) {
          await analyzeAndAlert(content, settings);
        }
      }

      const interval = 15; // Default 15 mins
      console.log(`Waiting ${interval} minutes until next check...`);
      setTimeout(runLoop, interval * 60 * 1000);

    } catch (error) {
      console.error(`Error in monitoring loop: ${error.message}`);
      setTimeout(runLoop, 60000);
    }
  };

  runLoop();
};

module.exports = {
  startMonitoring
};
