from fastapi import FastAPI, APIRouter, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os
import logging
from datetime import datetime, timezone
from typing import List, Optional

from models import (
    User, UserCreate, UserLogin, Token,
    Source, SourceCreate,
    Content, ContentCreate,
    Analysis, AnalysisCreate,
    Alert, AlertCreate, AlertUpdate,
    Keyword, KeywordCreate,
    Settings, SettingsUpdate,
    AuditLog, AuditLogCreate
)
from auth import hash_password, verify_password, create_access_token, get_current_user
from analysis_engine import analyze_content
from email_service import send_alert_email

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Collections
users_collection = db.users
sources_collection = db.sources
content_collection = db.content
analysis_collection = db.analysis
alerts_collection = db.alerts
keywords_collection = db.keywords
settings_collection = db.settings
audit_collection = db.audit_logs

# Create the main app
app = FastAPI(title="Blura Hub API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Helper function for audit logs
async def create_audit_log(user_data: dict, action: str, resource_type: str, resource_id: str = None, details: dict = None):
    audit_log = AuditLogCreate(
        user_id=user_data.get("user_id"),
        user_email=user_data.get("email"),
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details or {}
    )
    doc = audit_log.model_dump()
    doc['timestamp'] = datetime.now(timezone.utc).isoformat()
    await audit_collection.insert_one(doc)

# ============ AUTH ROUTES ============

@api_router.post("/auth/register", response_model=User, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate):
    # Check if user exists
    existing = await users_collection.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password
    hashed_pwd = hash_password(user_data.password)
    
    # Create user
    user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        role=user_data.role
    )
    
    doc = user.model_dump()
    doc['password'] = hashed_pwd
    doc['created_at'] = doc['created_at'].isoformat()
    
    await users_collection.insert_one(doc)
    return user

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    # Find user
    user_doc = await users_collection.find_one({"email": credentials.email}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Verify password
    if not verify_password(credentials.password, user_doc['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Check if active
    if not user_doc.get('is_active', True):
        raise HTTPException(status_code=403, detail="Account is inactive")
    
    # Create token
    user = User(**{k: v for k, v in user_doc.items() if k != 'password'})
    token_data = {"user_id": user.id, "email": user.email, "role": user.role}
    access_token = create_access_token(token_data)
    
    return Token(access_token=access_token, user=user)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: dict = Depends(get_current_user)):
    user_doc = await users_collection.find_one({"id": current_user["user_id"]}, {"_id": 0, "password": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**user_doc)

# ============ SOURCES ROUTES ============

@api_router.get("/sources", response_model=List[Source])
async def get_sources(
    platform: Optional[str] = None,
    is_active: Optional[bool] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if platform:
        query["platform"] = platform
    if is_active is not None:
        query["is_active"] = is_active
    
    sources = await sources_collection.find(query, {"_id": 0}).to_list(1000)
    for source in sources:
        if isinstance(source.get('created_at'), str):
            source['created_at'] = datetime.fromisoformat(source['created_at'])
        if source.get('last_checked') and isinstance(source['last_checked'], str):
            source['last_checked'] = datetime.fromisoformat(source['last_checked'])
    return sources

@api_router.post("/sources", response_model=Source, status_code=status.HTTP_201_CREATED)
async def create_source(source_data: SourceCreate, current_user: dict = Depends(get_current_user)):
    # Check for duplicates
    existing = await sources_collection.find_one({
        "platform": source_data.platform,
        "identifier": source_data.identifier
    }, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Source already exists")
    
    source = Source(**source_data.model_dump(), created_by=current_user["user_id"])
    doc = source.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    if doc.get('last_checked'):
        doc['last_checked'] = doc['last_checked'].isoformat()
    
    await sources_collection.insert_one(doc)
    await create_audit_log(current_user, "create", "source", source.id, {"display_name": source.display_name})
    return source

@api_router.put("/sources/{source_id}", response_model=Source)
async def update_source(source_id: str, source_data: SourceCreate, current_user: dict = Depends(get_current_user)):
    existing = await sources_collection.find_one({"id": source_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Source not found")
    
    update_doc = source_data.model_dump()
    await sources_collection.update_one({"id": source_id}, {"$set": update_doc})
    
    updated = await sources_collection.find_one({"id": source_id}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    if updated.get('last_checked') and isinstance(updated['last_checked'], str):
        updated['last_checked'] = datetime.fromisoformat(updated['last_checked'])
    
    await create_audit_log(current_user, "update", "source", source_id, update_doc)
    return Source(**updated)

@api_router.delete("/sources/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_source(source_id: str, current_user: dict = Depends(get_current_user)):
    result = await sources_collection.delete_one({"id": source_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Source not found")
    
    await create_audit_log(current_user, "delete", "source", source_id, {})
    return None

# ============ CONTENT ROUTES ============

@api_router.get("/content", response_model=List[dict])
async def get_content(
    platform: Optional[str] = None,
    source_id: Optional[str] = None,
    risk_level: Optional[str] = None,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    # Build aggregation pipeline to join content with analysis
    match_stage = {}
    if platform:
        match_stage["platform"] = platform
    if source_id:
        match_stage["source_id"] = source_id
    
    pipeline = [
        {"$match": match_stage} if match_stage else {"$match": {}},
        {"$sort": {"published_at": -1}},
        {"$limit": limit},
        {"$lookup": {
            "from": "analysis",
            "localField": "id",
            "foreignField": "content_id",
            "as": "analysis"
        }},
        {"$unwind": {"path": "$analysis", "preserveNullAndEmptyArrays": True}},
        {"$project": {"_id": 0}}
    ]
    
    if risk_level:
        pipeline.insert(2, {"$match": {"analysis.risk_level": risk_level}})
    
    content_list = await content_collection.aggregate(pipeline).to_list(limit)
    return content_list

@api_router.get("/content/{content_id}", response_model=dict)
async def get_content_detail(content_id: str, current_user: dict = Depends(get_current_user)):
    pipeline = [
        {"$match": {"id": content_id}},
        {"$lookup": {
            "from": "analysis",
            "localField": "id",
            "foreignField": "content_id",
            "as": "analysis"
        }},
        {"$unwind": {"path": "$analysis", "preserveNullAndEmptyArrays": True}},
        {"$lookup": {
            "from": "sources",
            "localField": "source_id",
            "foreignField": "id",
            "as": "source"
        }},
        {"$unwind": {"path": "$source", "preserveNullAndEmptyArrays": True}},
        {"$project": {"_id": 0}}
    ]
    
    result = await content_collection.aggregate(pipeline).to_list(1)
    if not result:
        raise HTTPException(status_code=404, detail="Content not found")
    return result[0]

# ============ ALERTS ROUTES ============

@api_router.get("/alerts", response_model=List[dict])
async def get_alerts(
    status_filter: Optional[str] = None,
    risk_level: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if status_filter:
        query["status"] = status_filter
    if risk_level:
        query["risk_level"] = risk_level
    
    alerts = await alerts_collection.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    for alert in alerts:
        if isinstance(alert.get('created_at'), str):
            alert['created_at'] = datetime.fromisoformat(alert['created_at'])
        if alert.get('acknowledged_at') and isinstance(alert['acknowledged_at'], str):
            alert['acknowledged_at'] = datetime.fromisoformat(alert['acknowledged_at'])
    return alerts

@api_router.put("/alerts/{alert_id}", response_model=Alert)
async def update_alert(alert_id: str, update_data: AlertUpdate, current_user: dict = Depends(get_current_user)):
    existing = await alerts_collection.find_one({"id": alert_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    update_doc = {
        "status": update_data.status,
        "acknowledged_by": current_user["user_id"],
        "acknowledged_at": datetime.now(timezone.utc).isoformat()
    }
    if update_data.notes:
        update_doc["notes"] = update_data.notes
    
    await alerts_collection.update_one({"id": alert_id}, {"$set": update_doc})
    
    updated = await alerts_collection.find_one({"id": alert_id}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    if updated.get('acknowledged_at') and isinstance(updated['acknowledged_at'], str):
        updated['acknowledged_at'] = datetime.fromisoformat(updated['acknowledged_at'])
    
    await create_audit_log(current_user, "update", "alert", alert_id, {"status": update_data.status})
    return Alert(**updated)

@api_router.get("/alerts/stats")
async def get_alert_stats(current_user: dict = Depends(get_current_user)):
    pipeline = [
        {"$group": {
            "_id": "$status",
            "count": {"$sum": 1}
        }}
    ]
    
    stats = await alerts_collection.aggregate(pipeline).to_list(10)
    return {"stats": stats}

# ============ ANALYTICS ROUTES ============

@api_router.get("/analytics/overview")
async def get_analytics_overview(current_user: dict = Depends(get_current_user)):
    # Total sources
    total_sources = await sources_collection.count_documents({})
    active_sources = await sources_collection.count_documents({"is_active": True})
    
    # Total content
    total_content = await content_collection.count_documents({})
    
    # Alerts by status
    active_alerts = await alerts_collection.count_documents({"status": "active"})
    total_alerts = await alerts_collection.count_documents({})
    
    # Risk distribution
    risk_pipeline = [
        {"$lookup": {
            "from": "analysis",
            "localField": "id",
            "foreignField": "content_id",
            "as": "analysis"
        }},
        {"$unwind": "$analysis"},
        {"$group": {
            "_id": "$analysis.risk_level",
            "count": {"$sum": 1}
        }}
    ]
    risk_dist = await content_collection.aggregate(risk_pipeline).to_list(10)
    
    return {
        "total_sources": total_sources,
        "active_sources": active_sources,
        "total_content": total_content,
        "active_alerts": active_alerts,
        "total_alerts": total_alerts,
        "risk_distribution": risk_dist
    }

@api_router.get("/analytics/trends")
async def get_trends(days: int = 7, current_user: dict = Depends(get_current_user)):
    # Content over time
    from datetime import timedelta
    start_date = datetime.now(timezone.utc) - timedelta(days=days)
    
    pipeline = [
        {"$match": {"created_at": {"$gte": start_date.isoformat()}}},
        {"$group": {
            "_id": {"$substr": ["$created_at", 0, 10]},
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]
    
    content_trend = await content_collection.aggregate(pipeline).to_list(days)
    
    # Alerts over time
    alert_pipeline = [
        {"$match": {"created_at": {"$gte": start_date.isoformat()}}},
        {"$group": {
            "_id": {
                "date": {"$substr": ["$created_at", 0, 10]},
                "risk_level": "$risk_level"
            },
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id.date": 1}}
    ]
    
    alert_trend = await alerts_collection.aggregate(pipeline).to_list(days * 3)
    
    return {
        "content_trend": content_trend,
        "alert_trend": alert_trend
    }

# ============ KEYWORDS ROUTES ============

@api_router.get("/keywords", response_model=List[Keyword])
async def get_keywords(category: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if category:
        query["category"] = category
    
    keywords = await keywords_collection.find(query, {"_id": 0}).to_list(1000)
    for kw in keywords:
        if isinstance(kw.get('created_at'), str):
            kw['created_at'] = datetime.fromisoformat(kw['created_at'])
    return keywords

@api_router.post("/keywords", response_model=Keyword, status_code=status.HTTP_201_CREATED)
async def create_keyword(keyword_data: KeywordCreate, current_user: dict = Depends(get_current_user)):
    keyword = Keyword(**keyword_data.model_dump())
    doc = keyword.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await keywords_collection.insert_one(doc)
    await create_audit_log(current_user, "create", "keyword", keyword.id, {"keyword": keyword.keyword})
    return keyword

@api_router.delete("/keywords/{keyword_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_keyword(keyword_id: str, current_user: dict = Depends(get_current_user)):
    result = await keywords_collection.delete_one({"id": keyword_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Keyword not found")
    
    await create_audit_log(current_user, "delete", "keyword", keyword_id, {})
    return None

# ============ SETTINGS ROUTES ============

@api_router.get("/settings", response_model=Settings)
async def get_settings(current_user: dict = Depends(get_current_user)):
    settings_doc = await settings_collection.find_one({"id": "global_settings"}, {"_id": 0})
    if not settings_doc:
        # Create default settings
        settings = Settings()
        doc = settings.model_dump()
        doc['updated_at'] = doc['updated_at'].isoformat()
        await settings_collection.insert_one(doc)
        return settings
    
    if isinstance(settings_doc.get('updated_at'), str):
        settings_doc['updated_at'] = datetime.fromisoformat(settings_doc['updated_at'])
    return Settings(**settings_doc)

@api_router.put("/settings", response_model=Settings)
async def update_settings(update_data: SettingsUpdate, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in ["super_admin", "analyst"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    update_doc = {k: v for k, v in update_data.model_dump().items() if v is not None}
    update_doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await settings_collection.update_one(
        {"id": "global_settings"},
        {"$set": update_doc},
        upsert=True
    )
    
    updated = await settings_collection.find_one({"id": "global_settings"}, {"_id": 0})
    if isinstance(updated.get('updated_at'), str):
        updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
    
    await create_audit_log(current_user, "update", "settings", "global_settings", update_doc)
    return Settings(**updated)

# ============ AUDIT LOGS ROUTES ============

@api_router.get("/audit", response_model=List[AuditLog])
async def get_audit_logs(
    limit: int = 100,
    resource_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if resource_type:
        query["resource_type"] = resource_type
    
    logs = await audit_collection.find(query, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    for log in logs:
        if isinstance(log.get('timestamp'), str):
            log['timestamp'] = datetime.fromisoformat(log['timestamp'])
    return logs

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

@app.on_event("startup")
async def startup_event():
    logger.info("Blura Hub API started")
    # Initialize default admin user if not exists
    admin = await users_collection.find_one({"email": "admin@blurahub.com"}, {"_id": 0})
    if not admin:
        admin_user = User(
            email="admin@blurahub.com",
            full_name="System Administrator",
            role="super_admin"
        )
        doc = admin_user.model_dump()
        doc['password'] = hash_password("admin123")
        doc['created_at'] = doc['created_at'].isoformat()
        await users_collection.insert_one(doc)
        logger.info("Default admin user created: admin@blurahub.com / admin123")
