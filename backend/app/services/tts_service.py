"""
Text-to-Speech Service
Uses Google Cloud TTS for native Nigerian language voices
Falls back to browser TTS for English
"""
import os
import logging
from typing import Optional, Tuple
import base64
import io

logger = logging.getLogger(__name__)

# Google Cloud TTS client (optional - only if API key is provided)
_tts_client = None

def _init_google_tts():
    """Initialize Google Cloud TTS client if credentials are available"""
    global _tts_client
    try:
        # Check for Google Cloud credentials
        # Can be set via GOOGLE_APPLICATION_CREDENTIALS env var (path to JSON key file)
        # Or GOOGLE_TTS_API_KEY for API key (alternative method)
        credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        api_key = os.getenv("GOOGLE_TTS_API_KEY")
        
        if not credentials_path and not api_key:
            logger.info("Google Cloud TTS credentials not set. Set GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_TTS_API_KEY")
            return None
        
        # Try to import google-cloud-texttospeech
        try:
            from google.cloud import texttospeech
            
            # Initialize client (will use GOOGLE_APPLICATION_CREDENTIALS if set)
            if credentials_path:
                _tts_client = texttospeech.TextToSpeechClient()
            else:
                # For API key, we'd need to use REST API instead
                # For now, require service account credentials
                logger.warning("GOOGLE_TTS_API_KEY not supported. Please use GOOGLE_APPLICATION_CREDENTIALS with service account JSON file")
                return None
                
            logger.info("Google Cloud TTS initialized successfully")
            return _tts_client
        except ImportError:
            logger.warning("google-cloud-texttospeech not installed. Install with: pip install google-cloud-texttospeech")
            return None
        except Exception as e:
            logger.error(f"Error initializing Google Cloud TTS client: {e}")
            return None
    except Exception as e:
        logger.error(f"Error initializing Google Cloud TTS: {e}")
        return None

# Initialize on module load
_tts_client = _init_google_tts()

# Language to Google Cloud TTS voice mapping
LANGUAGE_VOICE_MAP = {
    'yo': {  # Yoruba
        'language_code': 'yo-NG',
        'voice_name': 'yo-NG-Standard-A',  # Female voice
        'ssml_gender': 'FEMALE',
        'fallback_voice': 'yo-NG-Wavenet-A'  # Higher quality if available
    },
    'ha': {  # Hausa
        'language_code': 'ha-NG',
        'voice_name': 'ha-NG-Standard-A',  # Female voice
        'ssml_gender': 'FEMALE',
        'fallback_voice': 'ha-NG-Wavenet-A'
    },
    'ig': {  # Igbo
        'language_code': 'ig-NG',
        'voice_name': 'ig-NG-Standard-A',  # Female voice
        'ssml_gender': 'FEMALE',
        'fallback_voice': 'ig-NG-Wavenet-A'
    },
    'en': {  # English
        'language_code': 'en-US',
        'voice_name': 'en-US-Standard-F',  # Female voice
        'ssml_gender': 'FEMALE',
        'fallback_voice': 'en-US-Wavenet-F'
    }
}

def generate_speech_audio(text: str, language: str = 'en') -> Optional[Tuple[bytes, str]]:
    """
    Generate speech audio using Google Cloud TTS
    
    Args:
        text: Text to convert to speech
        language: Language code (yo, ha, ig, en)
    
    Returns:
        Tuple of (audio_bytes, content_type) or None if generation fails
    """
    if not _tts_client:
        logger.warning("Google Cloud TTS not available, cannot generate native voice")
        return None
    
    try:
        from google.cloud import texttospeech
        
        # Get voice configuration
        voice_config = LANGUAGE_VOICE_MAP.get(language, LANGUAGE_VOICE_MAP['en'])
        
        # Prepare the synthesis input
        synthesis_input = texttospeech.SynthesisInput(text=text)
        
        # Build the voice request
        voice = texttospeech.VoiceSelectionParams(
            language_code=voice_config['language_code'],
            name=voice_config['voice_name'],
            ssml_gender=texttospeech.SsmlVoiceGender[voice_config['ssml_gender']]
        )
        
        # Select the type of audio file to return
        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3,
            speaking_rate=0.9,  # Slightly slower for better comprehension
            pitch=0.0,  # Neutral pitch
            volume_gain_db=0.0
        )
        
        # Perform the text-to-speech request
        try:
            response = _tts_client.synthesize_speech(
                input=synthesis_input,
                voice=voice,
                audio_config=audio_config
            )
            
            logger.info(f"Generated TTS audio for {language} language ({len(text)} characters)")
            return (response.audio_content, 'audio/mpeg')
            
        except Exception as e:
            # Try fallback voice if primary voice fails
            logger.warning(f"Primary voice failed, trying fallback: {e}")
            try:
                voice.name = voice_config.get('fallback_voice', voice_config['voice_name'])
                response = _tts_client.synthesize_speech(
                    input=synthesis_input,
                    voice=voice,
                    audio_config=audio_config
                )
                logger.info(f"Generated TTS audio using fallback voice for {language}")
                return (response.audio_content, 'audio/mpeg')
            except Exception as e2:
                logger.error(f"Fallback voice also failed: {e2}")
                return None
        
    except Exception as e:
        logger.error(f"Error generating speech audio: {e}")
        return None

def is_cloud_tts_available() -> bool:
    """Check if cloud TTS is available"""
    return _tts_client is not None

def get_supported_languages() -> list:
    """Get list of languages supported by cloud TTS"""
    if not _tts_client:
        return []
    return list(LANGUAGE_VOICE_MAP.keys())

