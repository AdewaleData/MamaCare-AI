import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';
import { useTranslation } from '../contexts/TranslationContext';
import { selectVoiceForLanguage, useCloudTTS } from '../utils/voiceSelection';

interface VoiceAssistantProps {
  text: string;
  autoPlay?: boolean;
  language?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function VoiceAssistant({ 
  text, 
  autoPlay = false, 
  language,
  className = '',
  size = 'md'
}: VoiceAssistantProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const { language: userLanguage } = useTranslation();
  
  // Determine language for speech
  const speechLanguage = language || userLanguage || 'en';
  
  // Map language codes to speech synthesis language codes
  const languageMap: Record<string, string> = {
    'en': 'en-US',
    'ha': 'ha-NG', // Hausa (Nigeria)
    'yo': 'yo-NG', // Yoruba (Nigeria)
    'ig': 'ig-NG', // Igbo (Nigeria)
  };
  
  const speechLang = languageMap[speechLanguage] || 'en-US';

  useEffect(() => {
    // Check if browser supports speech synthesis
    if ('speechSynthesis' in window) {
      setIsSupported(true);
    } else {
      setIsSupported(false);
      setError('Your browser does not support text-to-speech');
    }

    // Cleanup on unmount
    return () => {
      if (utteranceRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    // Auto-play if enabled
    if (autoPlay && isSupported && text) {
      speak();
    }
  }, [autoPlay, text]);

  const speak = async () => {
    if (!isSupported || !text) return;

    try {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      // Create new utterance
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = speechLang;
      
      // Select the best voice for this language (Yoruba, Hausa, Igbo, or English)
      const selectedVoice = await selectVoiceForLanguage(speechLanguage);
      
      // For Nigerian languages, try cloud TTS if browser voice not available
      if (!selectedVoice && ['yo', 'ha', 'ig'].includes(speechLanguage)) {
        console.log(`[VoiceAssistant] No browser voice for ${speechLanguage}, trying cloud TTS...`);
        const cloudAudioUrl = await useCloudTTS(text, speechLanguage);
        
        if (cloudAudioUrl) {
          // Use cloud TTS audio
          audioUrlRef.current = cloudAudioUrl;
          const audio = new Audio(cloudAudioUrl);
          audioRef.current = audio;
          
          audio.onplay = () => {
            setIsPlaying(true);
            setError(null);
          };
          
          audio.onended = () => {
            setIsPlaying(false);
            if (audioUrlRef.current) {
              URL.revokeObjectURL(audioUrlRef.current);
              audioUrlRef.current = null;
            }
            audioRef.current = null;
          };
          
          audio.onerror = () => {
            setIsPlaying(false);
            setError('Error playing audio');
            if (audioUrlRef.current) {
              URL.revokeObjectURL(audioUrlRef.current);
              audioUrlRef.current = null;
            }
            audioRef.current = null;
          };
          
          await audio.play();
          return;
        } else {
          setError(`Native ${speechLanguage === 'yo' ? 'Yoruba' : speechLanguage === 'ha' ? 'Hausa' : 'Igbo'} voice not available`);
          return;
        }
      }
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang;
        console.log(`[VoiceAssistant] Using browser voice: ${selectedVoice.name} (${selectedVoice.lang}) for language: ${speechLanguage}`);
      } else {
        console.warn(`[VoiceAssistant] No specific voice found for ${speechLanguage}, using default`);
      }
      
      utterance.rate = 0.9; // Slightly slower for better comprehension
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Event handlers
      utterance.onstart = () => {
        setIsPlaying(true);
        setError(null);
      };

      utterance.onend = () => {
        setIsPlaying(false);
        utteranceRef.current = null;
      };

      utterance.onerror = (event) => {
        setIsPlaying(false);
        setError('Error playing audio');
        console.error('Speech synthesis error:', event);
        utteranceRef.current = null;
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      setError('Failed to play audio');
      setIsPlaying(false);
      console.error('Speech synthesis error:', err);
    }
  };

  const stop = () => {
    window.speechSynthesis.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setIsPlaying(false);
    utteranceRef.current = null;
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const toggle = () => {
    if (isPlaying) {
      stop();
    } else {
      speak();
    }
  };

  if (!isSupported) {
    return null; // Don't show button if not supported
  }

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  };

  return (
    <button
      onClick={toggle}
      disabled={!text || !!error}
      className={`
        ${sizeClasses[size]}
        flex items-center justify-center
        rounded-full
        bg-gradient-to-br from-primary-500 to-primary-600
        text-white
        hover:from-primary-600 hover:to-primary-700
        shadow-lg hover:shadow-xl
        transition-all duration-200
        transform hover:scale-110 active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      title={isPlaying ? 'Stop audio' : 'Play audio'}
      aria-label={isPlaying ? 'Stop audio' : 'Play audio'}
    >
      {isPlaying ? (
        <Loader2 className={`${size === 'sm' ? 'h-4 w-4' : size === 'md' ? 'h-5 w-5' : 'h-6 w-6'} animate-spin`} />
      ) : (
        <Volume2 className={`${size === 'sm' ? 'h-4 w-4' : size === 'md' ? 'h-5 w-5' : 'h-6 w-6'}`} />
      )}
    </button>
  );
}

// Hook for voice summaries
export function useVoiceSummary() {
  const { language } = useTranslation();
  const [isEnabled, setIsEnabled] = useState(() => {
    // Check if user has enabled voice in localStorage
    const stored = localStorage.getItem('voiceAssistantEnabled');
    // Default to true for better accessibility
    return stored === null ? true : stored === 'true';
  });
  const utteranceRef = React.useRef<SpeechSynthesisUtterance | null>(null);

  const speakSummary = async (summary: string, autoPlay = false) => {
    if (!isEnabled && !autoPlay) return;
    
    if ('speechSynthesis' in window && summary) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(summary);
      const languageMap: Record<string, string> = {
        'en': 'en-US',
        'ha': 'ha-NG',
        'yo': 'yo-NG',
        'ig': 'ig-NG',
      };
      utterance.lang = languageMap[language] || 'en-US';
      
      // Select the best voice for this language (Yoruba, Hausa, Igbo, or English)
      const selectedVoice = await selectVoiceForLanguage(language);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang; // Use the voice's actual language
        console.log(`[VoiceSummary] Using voice: ${selectedVoice.name} (${selectedVoice.lang}) for language: ${language}`);
      } else {
        console.warn(`[VoiceSummary] No specific voice found for ${language}, using default`);
      }
      
      utterance.rate = 0.85; // Slower for better comprehension
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleVoice = () => {
    const newValue = !isEnabled;
    setIsEnabled(newValue);
    localStorage.setItem('voiceAssistantEnabled', String(newValue));
    
    if (!newValue) {
      // Stop any ongoing speech
      window.speechSynthesis.cancel();
      utteranceRef.current = null;
    }
  };

  React.useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (utteranceRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return {
    isEnabled,
    toggleVoice,
    speakSummary,
  };
}

