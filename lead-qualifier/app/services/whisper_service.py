"""
Whisper Service - Transcrição de áudio usando OpenAI Whisper
"""
import logging
import httpx
import tempfile
import os
from typing import Optional
from openai import AsyncOpenAI
from config import settings

logger = logging.getLogger(__name__)


class WhisperService:
    """Serviço de transcrição de áudio usando OpenAI Whisper"""
    
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
    
    async def transcribe_audio(self, audio_url: str) -> Optional[str]:
        """
        Baixa um áudio de uma URL e transcreve usando Whisper.
        Retorna o texto transcrito ou None em caso de erro.
        """
        if not audio_url:
            return None
        
        try:
            # Baixar o áudio
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.get(audio_url)
                response.raise_for_status()
                audio_data = response.content
            
            # Determinar extensão do arquivo
            extension = ".ogg"
            if "mp3" in audio_url.lower():
                extension = ".mp3"
            elif "wav" in audio_url.lower():
                extension = ".wav"
            elif "m4a" in audio_url.lower():
                extension = ".m4a"
            elif "webm" in audio_url.lower():
                extension = ".webm"
            
            # Salvar temporariamente
            with tempfile.NamedTemporaryFile(suffix=extension, delete=False) as tmp_file:
                tmp_file.write(audio_data)
                tmp_path = tmp_file.name
            
            try:
                # Transcrever com Whisper
                with open(tmp_path, "rb") as audio_file:
                    transcription = await self.client.audio.transcriptions.create(
                        model="whisper-1",
                        file=audio_file,
                        language="pt"
                    )
                
                text = transcription.text.strip()
                logger.info(f"Audio transcribed: {text[:50]}...")
                return text
                
            finally:
                # Limpar arquivo temporário
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)
                    
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error downloading audio: {e.response.status_code}")
            return None
        except Exception as e:
            logger.error(f"Error transcribing audio: {e}")
            return None
    
    def is_audio_message(self, message_type: Optional[str], media_type: Optional[str]) -> bool:
        """Verifica se a mensagem é um áudio"""
        if message_type:
            mt = message_type.lower()
            if "audio" in mt or "ptt" in mt:
                return True
        
        if media_type:
            md = media_type.lower()
            if "audio" in md or "ogg" in md or "mp3" in md:
                return True
        
        return False
