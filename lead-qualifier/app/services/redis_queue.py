"""
Redis Queue - Gerenciamento de fila de qualificação
"""
import json
import logging
import redis
from typing import Optional, Callable, Any
from config import settings

logger = logging.getLogger(__name__)


class RedisQueue:
    """Gerenciador de fila Redis para processamento de leads"""
    
    def __init__(self):
        self.redis_client = redis.Redis(
            host=settings.redis_host,
            port=settings.redis_port,
            db=settings.redis_db,
            decode_responses=True
        )
        self.queue_name = settings.queue_name
    
    def is_connected(self) -> bool:
        """Verifica se a conexão com Redis está ativa"""
        try:
            self.redis_client.ping()
            return True
        except redis.ConnectionError:
            return False
    
    def publish(self, lead_id: str, company_id: str) -> bool:
        """Adiciona um lead na fila para processamento"""
        try:
            message = json.dumps({
                "lead_id": lead_id,
                "company_id": company_id
            })
            self.redis_client.rpush(self.queue_name, message)
            logger.debug(f"Published lead {lead_id} to queue")
            return True
        except Exception as e:
            logger.error(f"Error publishing to queue: {e}")
            return False
    
    def consume(self, timeout: int = 5) -> Optional[dict]:
        """Consome uma mensagem da fila (blocking)"""
        try:
            result = self.redis_client.blpop(self.queue_name, timeout=timeout)
            if result:
                _, message = result
                return json.loads(message)
            return None
        except Exception as e:
            logger.error(f"Error consuming from queue: {e}")
            return None
    
    def get_queue_length(self) -> int:
        """Retorna o tamanho atual da fila"""
        try:
            return self.redis_client.llen(self.queue_name)
        except Exception as e:
            logger.error(f"Error getting queue length: {e}")
            return 0
    
    def clear_queue(self) -> bool:
        """Limpa a fila (usar com cuidado)"""
        try:
            self.redis_client.delete(self.queue_name)
            logger.info("Queue cleared")
            return True
        except Exception as e:
            logger.error(f"Error clearing queue: {e}")
            return False
