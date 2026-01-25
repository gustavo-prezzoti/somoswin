"""
Lead data models
"""
from dataclasses import dataclass
from typing import Optional, List
from enum import Enum


class LeadStatus(str, Enum):
    NEW = "NEW"
    CONTACTED = "CONTACTED"
    QUALIFIED = "QUALIFIED"
    MEETING_SCHEDULED = "MEETING_SCHEDULED"
    WON = "WON"
    LOST = "LOST"


@dataclass
class Lead:
    id: str
    company_id: str
    name: str
    phone: Optional[str]
    email: Optional[str]
    status: LeadStatus
    notes: Optional[str]
    manually_qualified: bool = False


@dataclass
class Message:
    id: str
    content: str
    from_me: bool
    timestamp: int
    message_type: Optional[str] = None
    media_type: Optional[str] = None
    media_url: Optional[str] = None
