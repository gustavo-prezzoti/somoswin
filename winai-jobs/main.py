
import time
import schedule
import logging
from src.database import get_db_connection
from src.repository import fetch_companies, fetch_company_data, save_insights
from src.ai_service import generate_insights

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def run_job():
    logger.info("Starting AI Insights Job...")
    conn = get_db_connection()
    if not conn:
        logger.error("Failed to connect to database. Aborting job.")
        return

    try:
        companies = fetch_companies(conn)
        logger.info(f"Found {len(companies)} companies.")

        for company in companies:
            logger.info(f"Processing company: {company['name']}")
            try:
                data = fetch_company_data(conn, company['id'])
                insights = generate_insights(company['name'], data)
                
                if insights:
                    save_insights(conn, company['id'], insights)
                    logger.info(f"Saved {len(insights)} insights for {company['name']}")
                else:
                    logger.warning(f"No insights generated for {company['name']}")
            except Exception as e:
                logger.error(f"Error processing company {company['name']}: {e}")

    except Exception as e:
        logger.error(f"Error during job execution: {e}")
    finally:
        if conn:
            conn.close()
    logger.info("Job finished.")

if __name__ == "__main__":
    # Run immediately on startup
    run_job()

    # Schedule daily run
    schedule.every().day.at("06:00").do(run_job)

    logger.info("Scheduler active. Waiting for next run...")
    while True:
        schedule.run_pending()
        time.sleep(60)
