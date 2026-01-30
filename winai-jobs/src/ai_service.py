
import json
import logging
from openai import OpenAI
from .config import Config

logger = logging.getLogger(__name__)

def generate_insights(company_name, data):
    if not Config.OPENAI_API_KEY:
        logger.warning("OPENAI_API_KEY not found. Skipping generation.")
        return []

    client = OpenAI(api_key=Config.OPENAI_API_KEY)

    prompt = f"""
    Analyze the following data for company '{company_name}' and generate 3 specific strategic insights.
    
    Data:
    - Leads (Last 7 days): {data['leads_summary']}
    - Stalling Leads (>2h): {data['stalling_leads']}
    - Active Campaigns: {data['campaigns']}
    - Instagram Metrics (Last 7 days): {data['instagram_metrics']}

    Task: Generate exactly 3 insights in JSON format with the following keys:
    1. "scale_budget": Insight about scaling budget for campaigns (Type: SCALE_BUDGET).
    2. "lead_stalling": Notification about leads waiting for response (Type: LEAD_STALLING).
    3. "organic_growth": Suggestion for social media content based on engagement (Type: GROWTH_ORGANIC).

    Format the 'description' using Markdown (bold **text** for numbers/emphasis).
    Limit descriptions to 1-2 sentences.

    JSON Output Structure:
    [
        {{
            "title": "Escalar Orçamento",
            "description": "...",
            "insightType": "SCALE_BUDGET",
            "actionUrl": "/campanhas",
            "actionLabel": "Acessar Campanhas",
            "suggestionSource": "Agente de Tráfego",
            "priority": "HIGH"
        }},
        {{
            "title": "Lead Stalling",
            "description": "...",
            "insightType": "LEAD_STALLING",
            "actionUrl": "/whatsapp",
            "actionLabel": "Intervir via WhatsApp",
            "suggestionSource": "Agente SDR",
            "priority": "HIGH"
        }},
        {{
            "title": "Growth Orgânico",
            "description": "...",
            "insightType": "GROWTH_ORGANIC",
            "actionUrl": "/social",
            "actionLabel": "Criar Roteiros",
            "suggestionSource": "IA Social Media",
            "priority": "MEDIUM"
        }}
    ]
    """

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are an expert Digital Marketing Analyst AI."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"}
        )
        content = response.choices[0].message.content
        result = json.loads(content)
        
        if isinstance(result, dict) and 'insights' in result:
            return result['insights']
        elif isinstance(result, list):
            return result
        elif isinstance(result, dict):
             for key, value in result.items():
                 if isinstance(value, list):
                     return value
        return []
    except Exception as e:
        logger.error(f"Error calling OpenAI: {e}")
        return []
