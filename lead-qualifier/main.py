"""
Lead Qualifier Service - Entry Point
Serviço de qualificação automática de leads usando GPT-4o-mini
"""
import asyncio
import logging
import sys
from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from config import settings
from app.services.qualifier import LeadQualifier

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


async def run_qualification():
    """Executa o ciclo de qualificação"""
    logger.info("=" * 50)
    logger.info(f"Starting qualification job at {datetime.now()}")
    logger.info("=" * 50)
    
    try:
        qualifier = LeadQualifier()
        stats = await qualifier.run_qualification_cycle()
        
        logger.info(f"Job completed - Total: {stats['total_leads']}, "
                   f"Processed: {stats['processed']}, "
                   f"Updated: {stats['updated']}, "
                   f"Skipped: {stats['skipped']}, "
                   f"Errors: {stats['errors']}")
    except Exception as e:
        logger.error(f"Error in qualification job: {e}")


def main():
    """Entry point principal"""
    logger.info("=" * 60)
    logger.info("Lead Qualifier Service Starting")
    logger.info("=" * 60)
    logger.info(f"Configuration:")
    logger.info(f"  - Java API URL: {settings.java_api_url}")
    logger.info(f"  - Redis: {settings.redis_host}:{settings.redis_port}")
    logger.info(f"  - Cron interval: {settings.cron_interval_minutes} minutes")
    logger.info(f"  - OpenAI Model: {settings.openai_model}")
    logger.info(f"  - Run on startup: {settings.run_on_startup}")
    logger.info("=" * 60)
    
    # Criar scheduler
    scheduler = AsyncIOScheduler()
    
    # Adicionar job de qualificação
    scheduler.add_job(
        run_qualification,
        trigger=IntervalTrigger(minutes=settings.cron_interval_minutes),
        id='lead_qualification',
        name='Lead Qualification Job',
        replace_existing=True
    )
    
    async def startup():
        """Inicialização assíncrona"""
        # Executar na inicialização se configurado
        if settings.run_on_startup:
            logger.info("Running initial qualification on startup...")
            await run_qualification()
        
        # Iniciar scheduler
        scheduler.start()
        logger.info(f"Scheduler started. Next run in {settings.cron_interval_minutes} minutes.")
        
        # Manter o serviço rodando
        try:
            while True:
                await asyncio.sleep(60)
        except (KeyboardInterrupt, SystemExit):
            logger.info("Shutting down scheduler...")
            scheduler.shutdown()
    
    # Executar loop assíncrono
    asyncio.run(startup())


if __name__ == "__main__":
    main()
