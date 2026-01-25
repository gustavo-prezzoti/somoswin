"""
OpenAI Service - Integração com GPT-4o para qualificação de leads
Suporta análise de texto, imagens (Vision) e transcrições de áudio
"""
import logging
import base64
import httpx
from typing import List, Optional, Tuple
from openai import AsyncOpenAI
from config import settings
from app.models import Lead, Message, LeadStatus
from app.services.whisper_service import WhisperService

logger = logging.getLogger(__name__)


class OpenAIService:
    """Serviço de integração com OpenAI para análise de leads"""
    
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.model = settings.openai_model
        self.whisper = WhisperService()
    
    async def analyze_lead(self, lead: Lead, messages: List[Message]) -> Optional[LeadStatus]:
        """
        Analisa um lead e suas mensagens para determinar o status apropriado.
        Suporta análise de texto, imagens e transcrições de áudio.
        Retorna o novo status sugerido ou None se o status atual está correto.
        """
        if not messages:
            logger.debug(f"No messages for lead {lead.id}, keeping current status")
            return None
        
        # Processar mensagens - transcrever áudios e preparar imagens
        processed_messages, image_urls = await self._process_messages(messages)
        
        # Preparar contexto das mensagens
        conversation_context = self._format_messages(processed_messages)
        
        # Prompt para análise
        system_prompt = """Você é um especialista em qualificação de leads de vendas.
Analise a conversa abaixo e determine o status mais apropriado para o lead.

STATUS POSSÍVEIS:
- NEW: Lead que acabou de entrar, sem interação significativa
- CONTACTED: Lead que foi contactado e respondeu
- QUALIFIED: Lead que demonstrou interesse real no produto/serviço
- MEETING_SCHEDULED: Lead que agendou ou mencionou uma reunião/visita
- WON: Lead convertido (fechou negócio, comprou, assinou)
- LOST: Lead perdido (desistiu, não tem interesse, bloqueou)

REGRAS:
1. Se o lead demonstrou interesse claro, use QUALIFIED
2. Se mencionou agendamento de reunião/visita/consulta, use MEETING_SCHEDULED
3. Se claramente fechou negócio ou confirmou compra, use WON
4. Se desistiu, disse que não quer, ou pediu para não contactar mais, use LOST
5. Se apenas respondeu mas sem demonstrar interesse específico, use CONTACTED
6. Se não há informação suficiente, mantenha o status atual

Se houver imagens na conversa, analise-as para entender o contexto (podem ser prints de comprovantes, produtos de interesse, etc).

Responda APENAS com o nome do status em uma única palavra (NEW, CONTACTED, QUALIFIED, MEETING_SCHEDULED, WON ou LOST).
Se o status atual está correto, responda com: KEEP_CURRENT"""

        user_content = []
        
        # Adicionar texto principal
        text_prompt = f"""
LEAD ATUAL:
- Nome: {lead.name}
- Status atual: {lead.status.value}
- Notas: {lead.notes or 'Nenhuma'}

CONVERSA:
{conversation_context}

Qual deve ser o status deste lead?"""
        
        user_content.append({"type": "text", "text": text_prompt})
        
        # Adicionar imagens para análise Vision (máximo 3)
        for img_url in image_urls[:3]:
            try:
                user_content.append({
                    "type": "image_url",
                    "image_url": {"url": img_url, "detail": "low"}
                })
                logger.debug(f"Added image for Vision analysis: {img_url[:50]}...")
            except Exception as e:
                logger.warning(f"Could not add image: {e}")

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content}
                ],
                temperature=0.1,
                max_tokens=20
            )
            
            result = response.choices[0].message.content.strip().upper()
            
            if result == "KEEP_CURRENT":
                logger.debug(f"AI suggests keeping current status for lead {lead.id}")
                return None
            
            try:
                new_status = LeadStatus(result)
                if new_status != lead.status:
                    logger.info(f"AI suggests changing lead {lead.id} from {lead.status.value} to {new_status.value}")
                    return new_status
                return None
            except ValueError:
                logger.warning(f"Invalid status returned by AI: {result}")
                return None
                
        except Exception as e:
            logger.error(f"Error calling OpenAI API: {e}")
            return None
    
    async def _process_messages(self, messages: List[Message]) -> Tuple[List[dict], List[str]]:
        """
        Processa mensagens para extrair conteúdo de texto, transcrever áudios e coletar URLs de imagens.
        Retorna: (mensagens processadas com texto, lista de URLs de imagens)
        """
        processed = []
        image_urls = []
        
        for msg in messages:
            content = msg.content or ""
            
            # Verificar se é áudio
            if self.whisper.is_audio_message(msg.message_type, msg.media_type):
                if msg.media_url:
                    logger.debug(f"Transcribing audio message: {msg.id}")
                    transcription = await self.whisper.transcribe_audio(msg.media_url)
                    if transcription:
                        content = f"[ÁUDIO TRANSCRITO]: {transcription}"
                    else:
                        content = "[Áudio não transcrito]"
            
            # Verificar se é imagem
            elif self._is_image_message(msg.message_type, msg.media_type):
                if msg.media_url:
                    image_urls.append(msg.media_url)
                    content = content or "[Imagem enviada]"
            
            processed.append({
                "from_me": msg.from_me,
                "content": content
            })
        
        return processed, image_urls
    
    def _is_image_message(self, message_type: Optional[str], media_type: Optional[str]) -> bool:
        """Verifica se a mensagem é uma imagem"""
        if message_type:
            mt = message_type.lower()
            if "image" in mt or "sticker" in mt:
                return True
        
        if media_type:
            md = media_type.lower()
            if "image" in md or "png" in md or "jpg" in md or "jpeg" in md:
                return True
        
        return False
    
    def _format_messages(self, messages: List[dict]) -> str:
        """Formata as mensagens para o prompt"""
        formatted = []
        for msg in messages:
            sender = "EMPRESA" if msg["from_me"] else "LEAD"
            content = msg["content"] or "[mensagem vazia]"
            formatted.append(f"[{sender}]: {content}")
        
        return "\n".join(formatted)
