"""
Java API Client - Comunicação com Backend Java
"""
import httpx
import logging
from typing import List, Optional, Dict, Any
import asyncio
from config import settings
from app.models import Lead, Message, LeadStatus

logger = logging.getLogger(__name__)

# Um pool por processo: menos resoluções DNS e conexões novas (evita Errno -2 / "All connection attempts failed" em rajadas)
_java_backend_http: Optional[httpx.AsyncClient] = None


async def _shared_backend_client() -> httpx.AsyncClient:
    global _java_backend_http
    if _java_backend_http is None or _java_backend_http.is_closed:
        _java_backend_http = httpx.AsyncClient(
            timeout=httpx.Timeout(60.0, connect=15.0),
            limits=httpx.Limits(max_keepalive_connections=10, max_connections=30),
        )
    return _java_backend_http


class JavaApiClient:
    """Cliente HTTP para comunicação com o backend Java"""
    
    def __init__(self):
        self.base_url = settings.java_api_url
        self.api_key = settings.internal_api_key
        self.headers = {
            "Content-Type": "application/json",
            "X-Internal-Key": self.api_key
        }
    
    async def get_pending_leads(self, retries=3, delay=2.0) -> List[Lead]:
        """Busca todos os leads pendentes de qualificação com retry"""
        for attempt in range(retries):
            try:
                client = await _shared_backend_client()
                response = await client.get(
                    f"{self.base_url}/api/internal/leads/pending-qualification",
                    headers=self.headers
                )
                response.raise_for_status()
                
                data = response.json()
                leads = []
                for item in data:
                    lead = Lead(
                        id=item["id"],
                        company_id=item["companyId"],
                        name=item["name"],
                        phone=item.get("phone"),
                        email=item.get("email"),
                        status=LeadStatus(item["status"]),
                        notes=item.get("notes"),
                        manually_qualified=item.get("manuallyQualified", False)
                    )
                    leads.append(lead)
                
                logger.info(f"Fetched {len(leads)} pending leads")
                return leads
                    
            except httpx.HTTPStatusError as e:
                logger.error(f"HTTP error fetching leads: {e.response.status_code}")
                return []
            except Exception as e:
                if attempt < retries - 1:
                    logger.warning(f"Error fetching pending leads (attempt {attempt+1}/{retries}): {e}. Retrying in {delay}s...")
                    await asyncio.sleep(delay)
                else:
                    logger.error(f"Error fetching pending leads after {retries} attempts: {e}")
                    return []
        return []
    
    async def get_lead_messages(self, lead_id: str, limit: int = 20, retries: int = 3, delay: float = 2.0) -> List[Message]:
        """Busca mensagens de um lead específico com retry"""
        for attempt in range(retries):
            try:
                client = await _shared_backend_client()
                response = await client.get(
                    f"{self.base_url}/api/internal/leads/{lead_id}/messages",
                    params={"limit": limit},
                    headers=self.headers
                )
                response.raise_for_status()
                
                data = response.json()
                messages = []
                for item in data:
                    msg = Message(
                        id=item["id"],
                        content=item.get("content", ""),
                        from_me=item.get("fromMe", False),
                        timestamp=item.get("timestamp", 0),
                        message_type=item.get("messageType"),
                        media_type=item.get("mediaType"),
                        media_url=item.get("mediaUrl")
                    )
                    messages.append(msg)
                
                logger.debug(f"Fetched {len(messages)} messages for lead {lead_id}")
                return messages
                    
            except httpx.HTTPStatusError as e:
                logger.error(f"HTTP error fetching messages: {e.response.status_code}")
                return []
            except Exception as e:
                if attempt < retries - 1:
                    logger.warning(f"Error fetching messages for lead {lead_id} (attempt {attempt+1}/{retries}): {e}. Retrying in {delay}s...")
                    await asyncio.sleep(delay)
                else:
                    logger.error(f"Error fetching messages for lead {lead_id}: {e}")
                    return []
        return []
    
    async def update_lead_status(self, lead_id: str, new_status: LeadStatus, retries: int = 3, delay: float = 2.0) -> bool:
        """Atualiza o status de um lead com retry"""
        for attempt in range(retries):
            try:
                client = await _shared_backend_client()
                response = await client.put(
                    f"{self.base_url}/api/internal/leads/{lead_id}/qualify",
                    json={"status": new_status.value},
                    headers=self.headers
                )
                response.raise_for_status()
                
                result = response.json()
                success = result.get("success", False)
                
                if success:
                    logger.info(f"Updated lead {lead_id} to status {new_status.value}")
                else:
                    logger.info(f"Lead {lead_id} not updated: {result.get('reason', 'unknown')}")
                
                return success
                    
            except httpx.HTTPStatusError as e:
                logger.error(f"HTTP error updating lead: {e.response.status_code}")
                return False
            except Exception as e:
                if attempt < retries - 1:
                    logger.warning(f"Error updating lead {lead_id} (attempt {attempt+1}/{retries}): {e}. Retrying in {delay}s...")
                    await asyncio.sleep(delay)
                else:
                    logger.error(f"Error updating lead {lead_id}: {e}")
                    return False
        return False
