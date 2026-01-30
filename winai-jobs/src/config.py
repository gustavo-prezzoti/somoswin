
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    DB_HOST = os.getenv('DB_HOST', 'aws-1-sa-east-1.pooler.supabase.com')
    DB_PORT = os.getenv('DB_PORT', '5432')
    DB_NAME = os.getenv('DB_NAME', 'postgres')
    DB_USER = os.getenv('DB_USER', 'postgres.wtfheobvaamelqifttjj')
    DB_PASSWORD = os.getenv('DB_PASSWORD', 'JYAvOfrciMaY4m0j')
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
