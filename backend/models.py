from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Literal
from datetime import datetime
import uuid

# Auth Models
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: Literal["super_admin", "analyst", "viewer"] = "analyst"

class UserCreate(UserBase):
    password: str

class User(UserBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now())
    is_active: bool = True

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: User

# Source Models
class SourceBase(BaseModel):
    platform: Literal["youtube", "x"]
    identifier: str  # channel ID or username
    display_name: str
    category: Literal["news", "influencer", "political", "unknown"] = "unknown"
    is_active: bool = True

class SourceCreate(SourceBase):
    pass

class Source(SourceBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now())
    created_by: str
    last_checked: Optional[datetime] = None

# Content Models
class ContentBase(BaseModel):
    source_id: str
    platform: Literal["youtube", "x"]
    content_id: str  # video ID or tweet ID
    content_url: str
    text: str
    author: str
    author_handle: str
    published_at: datetime
    engagement: dict  # likes, views, retweets, etc

class ContentCreate(ContentBase):
    pass

class Content(ContentBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now())

# Analysis Models
class AnalysisBase(BaseModel):
    content_id: str
    violence_score: int  # 0-100
    threat_score: int  # 0-100
    hate_score: int  # 0-100
    sentiment: Literal["positive", "neutral", "negative"]
    risk_level: Literal["LOW", "MEDIUM", "HIGH"]
    triggered_keywords: List[str]
    explanation: str

class AnalysisCreate(AnalysisBase):
    pass

class Analysis(AnalysisBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    analyzed_at: datetime = Field(default_factory=lambda: datetime.now())

# Alert Models
class AlertBase(BaseModel):
    content_id: str
    analysis_id: str
    risk_level: Literal["MEDIUM", "HIGH"]
    title: str
    description: str
    content_url: str
    platform: Literal["youtube", "x"]
    author: str

class AlertCreate(AlertBase):
    pass

class Alert(AlertBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now())
    status: Literal["active", "acknowledged", "escalated", "false_positive"] = "active"
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    notes: Optional[str] = None

class AlertUpdate(BaseModel):
    status: Literal["acknowledged", "escalated", "false_positive"]
    notes: Optional[str] = None

# Keyword Models
class KeywordBase(BaseModel):
    category: Literal["violence", "threat", "hate"]
    keyword: str
    weight: int = 1  # multiplier for scoring

class KeywordCreate(KeywordBase):
    pass

class Keyword(KeywordBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now())

# Settings Models
class Settings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "global_settings"
    risk_threshold_high: int = 70  # Score above this = HIGH
    risk_threshold_medium: int = 40  # Score above this = MEDIUM
    alert_email_admin: EmailStr = "admin@blurahub.com"
    alert_email_police: EmailStr = "police.alerts@blurahub.com"
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    monitoring_interval_minutes: int = 15
    youtube_api_key: str = ""
    x_bearer_token: str = ""
    updated_at: datetime = Field(default_factory=lambda: datetime.now())

class SettingsUpdate(BaseModel):
    risk_threshold_high: Optional[int] = None
    risk_threshold_medium: Optional[int] = None
    alert_email_admin: Optional[EmailStr] = None
    alert_email_police: Optional[EmailStr] = None
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    monitoring_interval_minutes: Optional[int] = None
    youtube_api_key: Optional[str] = None
    x_bearer_token: Optional[str] = None

# Audit Log Models
class AuditLogBase(BaseModel):
    user_id: str
    user_email: str
    action: str
    resource_type: str  # source, alert, keyword, settings
    resource_id: Optional[str] = None
    details: dict

class AuditLogCreate(AuditLogBase):
    pass

class AuditLog(AuditLogBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = Field(default_factory=lambda: datetime.now())
