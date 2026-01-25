"""
Lead Qualifier - Lógica principal de qualificação
"""
import asyncio
import logging
from typing import List
from app.models import Lead, LeadStatus
from app.services.java_api_client import JavaApiClient
from app.services.openai_service import OpenAIService
from app.services.redis_queue import RedisQueue

logger = logging.getLogger(__name__)


class LeadQualifier:
    """Orquestrador principal de qualificação de leads"""
    
    def __init__(self):
        self.api_client = JavaApiClient()
        self.openai_service = OpenAIService()
        self.redis_queue = RedisQueue()
    
    async def run_qualification_cycle(self) -> dict:
        """
        Executa um ciclo completo de qualificação:
        1. Busca leads pendentes
        2. Publica na fila Redis
        3. Processa cada lead
        """
        stats = {
            "total_leads": 0,
            "processed": 0,
            "updated": 0,
            "skipped": 0,
            "errors": 0
        }
        
        logger.info("Starting qualification cycle...")
        
        # 1. Buscar leads pendentes
        leads = await self.api_client.get_pending_leads()
        stats["total_leads"] = len(leads)
        
        if not leads:
            logger.info("No pending leads to process")
            return stats
        
        # 2. Publicar na fila
        for lead in leads:
            if not lead.manually_qualified:
                self.redis_queue.publish(lead.id, lead.company_id)
        
        # 3. Processar fila
        while True:
            message = self.redis_queue.consume(timeout=2)
            if not message:
                break
            
            lead_id = message.get("lead_id")
            if not lead_id:
                continue
            
            # Encontrar lead nos dados já carregados
            lead = next((l for l in leads if l.id == lead_id), None)
            if not lead:
                stats["skipped"] += 1
                continue
            
            try:
                result = await self.process_lead(lead)
                stats["processed"] += 1
                if result:
                    stats["updated"] += 1
            except Exception as e:
                logger.error(f"Error processing lead {lead_id}: {e}")
                stats["errors"] += 1
        
        logger.info(f"Qualification cycle completed: {stats}")
        return stats
    
    async def process_lead(self, lead: Lead) -> bool:
        """
        Processa um único lead:
        1. Busca mensagens
        2. Analisa com IA
        3. Atualiza status se necessário
        """
        logger.debug(f"Processing lead {lead.id} ({lead.name})")
        
        # 1. Buscar mensagens
        messages = await self.api_client.get_lead_messages(lead.id)
        
        if not messages:
            logger.debug(f"No messages for lead {lead.id}, skipping")
            return False
        
        # 2. Analisar com IA
        new_status = await self.openai_service.analyze_lead(lead, messages)
        
        if not new_status:
            logger.debug(f"No status change needed for lead {lead.id}")
            return False
        
        # 3. Atualizar status
        success = await self.api_client.update_lead_status(lead.id, new_status)
        
        if success:
            logger.info(f"Lead {lead.id} updated: {lead.status.value} -> {new_status.value}")
        
        return success
    
    async def process_single_lead(self, lead_id: str) -> bool:
        """Processa um único lead por ID (para uso manual/debug)"""
        leads = await self.api_client.get_pending_leads()
        lead = next((l for l in leads if l.id == lead_id), None)
        
        if not lead:
            logger.error(f"Lead {lead_id} not found")
            return False
        
        return await self.process_lead(lead)
