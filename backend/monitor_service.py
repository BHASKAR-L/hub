import asyncio
import os
import logging
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from googleapiclient.discovery import build
import tweepy
from dotenv import load_dotenv
from pathlib import Path

from models import Content, ContentCreate, Analysis
from analysis_engine import analyze_content
from email_service import send_alert_email

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

async def get_settings():
    \"\"\"Get current settings from database\"\"\"
    settings = await db.settings.find_one({"id": "global_settings"}, {"_id": 0})
    return settings or {}

async def monitor_youtube_source(source, youtube_api_key):
    \"\"\"Monitor a single YouTube channel\"\"\"
    try:
        youtube = build('youtube', 'v3', developerKey=youtube_api_key)
        
        # Get latest videos from channel
        request = youtube.search().list(
            part='snippet',
            channelId=source['identifier'],
            order='date',
            maxResults=10,
            type='video'
        )
        response = request.execute()
        
        new_content = []
        for item in response.get('items', []):
            video_id = item['id']['videoId']
            
            # Check if we already have this content
            existing = await db.content.find_one({"content_id": video_id}, {"_id": 0})
            if existing:
                continue
            
            # Get video details
            video_request = youtube.videos().list(
                part='snippet,statistics',
                id=video_id
            )
            video_response = video_request.execute()
            
            if not video_response.get('items'):
                continue
            
            video_data = video_response['items'][0]
            snippet = video_data['snippet']
            stats = video_data['statistics']
            
            # Create content object
            content = Content(
                source_id=source['id'],
                platform='youtube',
                content_id=video_id,
                content_url=f\"https://www.youtube.com/watch?v={video_id}\",
                text=f\"{snippet.get('title', '')} {snippet.get('description', '')}\",
                author=snippet.get('channelTitle', ''),
                author_handle=source['identifier'],
                published_at=datetime.fromisoformat(snippet['publishedAt'].replace('Z', '+00:00')),
                engagement={
                    'views': int(stats.get('viewCount', 0)),
                    'likes': int(stats.get('likeCount', 0)),
                    'comments': int(stats.get('commentCount', 0))
                }
            )
            
            # Save content
            content_doc = content.model_dump()
            content_doc['created_at'] = content_doc['created_at'].isoformat()
            content_doc['published_at'] = content_doc['published_at'].isoformat()
            await db.content.insert_one(content_doc)
            
            new_content.append(content)
            logger.info(f\"New YouTube video: {video_id} from {source['display_name']}\")
        
        # Update last_checked
        await db.sources.update_one(
            {"id": source['id']},
            {"$set": {"last_checked": datetime.now(timezone.utc).isoformat()}}
        )
        
        return new_content
    
    except Exception as e:
        logger.error(f\"Error monitoring YouTube source {source['display_name']}: {e}\")
        return []

async def monitor_x_source(source, bearer_token):
    \"\"\"Monitor a single X (Twitter) account\"\"\"
    try:
        client_twitter = tweepy.Client(bearer_token=bearer_token)
        
        # Get user by username
        user = client_twitter.get_user(username=source['identifier'], user_fields=['id'])
        if not user.data:
            logger.error(f\"X user not found: {source['identifier']}\")
            return []
        
        user_id = user.data.id
        
        # Get latest tweets
        tweets = client_twitter.get_users_tweets(
            id=user_id,
            max_results=10,
            tweet_fields=['created_at', 'public_metrics', 'text'],
            exclude=['retweets', 'replies']
        )
        
        if not tweets.data:
            return []
        
        new_content = []
        for tweet in tweets.data:
            tweet_id = str(tweet.id)
            
            # Check if we already have this content
            existing = await db.content.find_one({"content_id": tweet_id}, {"_id": 0})
            if existing:
                continue
            
            # Create content object
            content = Content(
                source_id=source['id'],
                platform='x',
                content_id=tweet_id,
                content_url=f\"https://x.com/{source['identifier']}/status/{tweet_id}\",
                text=tweet.text,
                author=source['display_name'],
                author_handle=source['identifier'],
                published_at=tweet.created_at,
                engagement={
                    'likes': tweet.public_metrics['like_count'],
                    'retweets': tweet.public_metrics['retweet_count'],
                    'replies': tweet.public_metrics['reply_count'],
                    'views': tweet.public_metrics.get('impression_count', 0)
                }
            )
            
            # Save content
            content_doc = content.model_dump()
            content_doc['created_at'] = content_doc['created_at'].isoformat()
            content_doc['published_at'] = content_doc['published_at'].isoformat()
            await db.content.insert_one(content_doc)
            
            new_content.append(content)
            logger.info(f\"New X post: {tweet_id} from {source['display_name']}\")
        
        # Update last_checked
        await db.sources.update_one(
            {"id": source['id']},
            {"$set": {"last_checked": datetime.now(timezone.utc).isoformat()}}
        )
        
        return new_content
    
    except Exception as e:
        logger.error(f\"Error monitoring X source {source['display_name']}: {e}\")
        return []

async def analyze_and_alert(content, settings):
    \"\"\"Analyze content and create alert if needed\"\"\"
    try:
        # Analyze content
        analysis_data = analyze_content(
            content,
            settings.get('risk_threshold_high', 70),
            settings.get('risk_threshold_medium', 40)
        )
        
        # Save analysis
        analysis = Analysis(**analysis_data.model_dump())
        analysis_doc = analysis.model_dump()
        analysis_doc['analyzed_at'] = analysis_doc['analyzed_at'].isoformat()
        await db.analysis.insert_one(analysis_doc)
        
        # Create alert if risk is MEDIUM or HIGH
        if analysis.risk_level in ['MEDIUM', 'HIGH']:
            from models import Alert, AlertCreate
            
            alert = Alert(
                content_id=content.id,
                analysis_id=analysis.id,
                risk_level=analysis.risk_level,
                title=f\"{analysis.risk_level} Risk: {content.author}\",
                description=analysis.explanation,
                content_url=content.content_url,
                platform=content.platform,
                author=content.author
            )
            
            alert_doc = alert.model_dump()
            alert_doc['created_at'] = alert_doc['created_at'].isoformat()
            await db.alerts.insert_one(alert_doc)
            
            logger.info(f\"Alert created: {alert.id} - {alert.title}\")
            
            # Send email alert
            smtp_config = {
                'host': settings.get('smtp_host', ''),
                'port': settings.get('smtp_port', 587),
                'username': settings.get('smtp_username', ''),
                'password': settings.get('smtp_password', '')
            }
            
            to_emails = [
                settings.get('alert_email_admin', 'admin@blurahub.com'),
                settings.get('alert_email_police', 'police.alerts@blurahub.com')
            ]
            
            alert_data = {
                'risk_level': alert.risk_level,
                'platform': alert.platform,
                'author': alert.author,
                'content_url': alert.content_url,
                'description': alert.description,
                'triggered_keywords': analysis.triggered_keywords,
                'created_at': datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')
            }
            
            await send_alert_email(smtp_config, to_emails, alert_data)
        
    except Exception as e:
        logger.error(f\"Error analyzing content {content.id}: {e}\")

async def monitoring_loop():
    \"\"\"Main monitoring loop\"\"\"
    logger.info(\"Starting monitoring loop...\")
    
    while True:
        try:
            # Get settings
            settings = await get_settings()
            youtube_api_key = settings.get('youtube_api_key', '')
            x_bearer_token = settings.get('x_bearer_token', '')
            
            if not youtube_api_key and not x_bearer_token:
                logger.warning(\"No API keys configured. Waiting...\")\
                await asyncio.sleep(60)
                continue
            
            # Get active sources
            sources = await db.sources.find({"is_active": True}, {"_id": 0}).to_list(1000)
            
            if not sources:
                logger.info(\"No active sources to monitor\")
                await asyncio.sleep(60)
                continue
            
            logger.info(f\"Monitoring {len(sources)} sources...\")
            
            # Monitor each source
            for source in sources:
                try:
                    new_content = []
                    
                    if source['platform'] == 'youtube' and youtube_api_key:
                        new_content = await monitor_youtube_source(source, youtube_api_key)
                    elif source['platform'] == 'x' and x_bearer_token:
                        new_content = await monitor_x_source(source, x_bearer_token)
                    
                    # Analyze new content
                    for content in new_content:
                        await analyze_and_alert(content, settings)
                    
                except Exception as e:
                    logger.error(f\"Error processing source {source['display_name']}: {e}\")
                    continue
            
            # Wait before next check
            interval = settings.get('monitoring_interval_minutes', 15)
            logger.info(f\"Waiting {interval} minutes until next check...\")
            await asyncio.sleep(interval * 60)
        
        except Exception as e:
            logger.error(f\"Error in monitoring loop: {e}\")
            await asyncio.sleep(60)

if __name__ == \"__main__\":
    asyncio.run(monitoring_loop())
