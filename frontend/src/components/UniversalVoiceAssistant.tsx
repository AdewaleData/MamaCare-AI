/**
 * Universal Voice Assistant Component
 * Intelligent voice assistant that works across all pages
 * Provides accurate summaries and navigation guidance
 */
import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { Volume2, VolumeX, Loader2, X, Minimize2, Maximize2, Settings, HelpCircle } from 'lucide-react';
import { useTranslation } from '../contexts/TranslationContext';
import { voiceApi } from '../services/api';
import { selectVoiceForLanguage, getVoiceAvailabilityMessage, useCloudTTS } from '../utils/voiceSelection';

interface UniversalVoiceAssistantProps {
  className?: string;
  autoPlay?: boolean;
}

// Map routes to page types - comprehensive detection for all pages
const getPageType = (pathname: string): string => {
  // Exact path matching first for better accuracy
  if (pathname === '/app/dashboard' || pathname === '/dashboard') {
    return 'dashboard';
  }
  if (pathname.includes('/provider-dashboard') || pathname.includes('/government-dashboard')) {
    return 'dashboard';
  }
  if (pathname === '/app/health' || pathname === '/health') {
    return 'health';
  }
  if (pathname.includes('/health/new') || pathname.match(/\/health\/[a-f0-9-]+$/)) {
    return 'health'; // New health record or detail page
  }
  if (pathname === '/app/risk-assessment' || pathname === '/risk-assessment') {
    return 'risk';
  }
  if (pathname === '/app/recommendations' || pathname === '/recommendations') {
    return 'recommendations';
  }
  if (pathname === '/app/pregnancy' || pathname === '/pregnancy') {
    return 'pregnancy';
  }
  if (pathname === '/app/appointments' || pathname === '/appointments') {
    return 'appointments';
  }
  if (pathname === '/app/hospitals' || pathname === '/hospitals') {
    return 'hospitals';
  }
  // Fallback for other pages (emergency, profile, subscriptions, etc.)
  return 'dashboard';
};

export default function UniversalVoiceAssistant({ 
  className = '',
  autoPlay = false 
}: UniversalVoiceAssistantProps) {
  const location = useLocation();
  const { language, t } = useTranslation();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [useLlm, setUseLlm] = useState(false);
  const [speechRate, setSpeechRate] = useState(0.9);
  const [speechPitch, setSpeechPitch] = useState(1.0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [voiceWarning, setVoiceWarning] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const pageType = getPageType(location.pathname);

  // Debug: Log page type detection
  useEffect(() => {
    console.log('[Voice Assistant] Current path:', location.pathname, '→ Page type:', pageType);
  }, [location.pathname, pageType]);

  // Fetch summary from backend with page type
  const { data: summaryData, isLoading, error, refetch } = useQuery({
    queryKey: ['voice-summary', pageType, language, useLlm],
    queryFn: async () => {
      console.log('[Voice Assistant] Fetching summary for page type:', pageType, 'language:', language);
      const result = await voiceApi.getSummary(useLlm, language, pageType);
      console.log('[Voice Assistant] Summary received:', result?.summary?.substring(0, 100) + '...');
      return result;
    },
    enabled: true,
    staleTime: 1800000, // 30 minutes - matches backend cache
    retry: 1,
  });

  const summary = summaryData?.summary || '';
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (utteranceRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Refetch when page changes or language changes
  useEffect(() => {
    if (pageType) {
      // Small delay to ensure page is fully loaded
      const timer = setTimeout(() => {
        refetch();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [pageType, language, refetch]);

  // Auto-play if enabled and summary is ready
  useEffect(() => {
    if (autoPlay && isSupported && summary && !isPlaying && !isMinimized) {
      speak();
    }
  }, [autoPlay, summary, isSupported, pageType]);

  const speak = async () => {
    if (!isSupported || !summary) {
      setHasError(true);
      setErrorMessage('Text-to-speech not supported or no summary available');
      return;
    }

    try {
      // Wait for speech synthesis to be ready
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        setTimeout(() => {
          speak();
        }, 100);
        return;
      }

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      // Small delay to ensure cancellation is complete
      setTimeout(async () => {
        try {
          // Create new utterance
          const utterance = new SpeechSynthesisUtterance(summary);
          
          // Map language codes to speech synthesis language codes
          const languageMap: Record<string, string> = {
            'en': 'en-US',
            'ha': 'ha-NG',
            'yo': 'yo-NG',
            'ig': 'ig-NG',
          };
          
          utterance.lang = languageMap[language] || 'en-US';
          
          // Select the best voice for this language (Yoruba, Hausa, Igbo, or English)
          const selectedVoice = await selectVoiceForLanguage(language);
          
          // For Nigerian languages, try cloud TTS if browser voice not available
          if (!selectedVoice && ['yo', 'ha', 'ig'].includes(language)) {
            console.log(`[UniversalVoiceAssistant] No browser voice for ${language}, trying cloud TTS...`);
            const cloudAudioUrl = await useCloudTTS(summary, language);
            
            if (cloudAudioUrl) {
              // Use cloud TTS audio
              setAudioUrl(cloudAudioUrl);
              setVoiceWarning(null);
              setHasError(false);
              setErrorMessage(null);
              
              // Create audio element and play
              const audio = new Audio(cloudAudioUrl);
              audioRef.current = audio;
              
              audio.onplay = () => {
                setIsPlaying(true);
                setHasError(false);
                setErrorMessage(null);
              };
              
              audio.onended = () => {
                setIsPlaying(false);
                if (audioUrl) {
                  URL.revokeObjectURL(audioUrl);
                  setAudioUrl(null);
                }
                audioRef.current = null;
              };
              
              audio.onerror = () => {
                setIsPlaying(false);
                setHasError(true);
                setErrorMessage('Error playing audio. Please try again.');
                if (audioUrl) {
                  URL.revokeObjectURL(audioUrl);
                  setAudioUrl(null);
                }
                audioRef.current = null;
              };
              
              await audio.play();
              return;
            } else {
              // Cloud TTS not available, show warning
              const availability = await getVoiceAvailabilityMessage(language);
              setVoiceWarning(availability.message);
              setHasError(true);
              setErrorMessage(`Native ${language === 'yo' ? 'Yoruba' : language === 'ha' ? 'Hausa' : 'Igbo'} voice not available. Please configure cloud TTS.`);
              console.error(`[UniversalVoiceAssistant] Cannot speak in ${language} - no native voice or cloud TTS available`);
              return;
            }
          }
          
          // Use browser TTS for English or if native voice is available
          if (selectedVoice) {
            utterance.voice = selectedVoice;
            utterance.lang = selectedVoice.lang;
            console.log(`[UniversalVoiceAssistant] Using browser voice: ${selectedVoice.name} (${selectedVoice.lang}) for language: ${language}`);
            setVoiceWarning(null);
          } else {
            console.warn(`[UniversalVoiceAssistant] No specific voice found for ${language}, using default`);
          }
          
          utterance.rate = speechRate;
          utterance.pitch = speechPitch;
          utterance.volume = 1.0;

          // Event handlers
          utterance.onstart = () => {
            setIsPlaying(true);
            setHasError(false);
            setErrorMessage(null);
          };

          utterance.onend = () => {
            setIsPlaying(false);
            utteranceRef.current = null;
          };

          utterance.onerror = (event) => {
            setIsPlaying(false);
            setHasError(true);
            setErrorMessage('Error playing audio. Please try again.');
            console.error('Speech synthesis error:', event);
            utteranceRef.current = null;
          };

          utteranceRef.current = utterance;
          window.speechSynthesis.speak(utterance);
        } catch (err) {
          setHasError(true);
          setErrorMessage('Failed to play audio. Please try again.');
          setIsPlaying(false);
          console.error('Speech synthesis error:', err);
        }
      }, 50);
    } catch (err) {
      setHasError(true);
      setErrorMessage('Failed to play audio. Please try again.');
      setIsPlaying(false);
      console.error('Speech synthesis error:', err);
    }
  };

  const stop = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setIsPlaying(false);
    utteranceRef.current = null;
  };
  
  // Cleanup audio URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [audioUrl]);

  const toggle = () => {
    if (isPlaying) {
      stop();
    } else {
      if (summary) {
        speak();
      } else {
        refetch();
      }
    }
  };

  const handleRefresh = () => {
    stop();
    refetch();
  };

  // Always show the component, even if speech isn't supported (user can still read the summary)
  // if (!isSupported) {
  //   return null;
  // }

  if (isMinimized) {
    return (
      <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center justify-center h-12 w-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-110"
          title={t('voice_assistant', 'Voice Assistant')}
        >
          <Volume2 className="h-6 w-6" />
        </button>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-primary-100">
        <div className="flex items-center space-x-2">
          <HelpCircle className="h-5 w-5 text-primary-600" />
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">
              {t('intelligent_voice_assistant', 'Intelligent Voice Assistant')}
            </h3>
            <p className="text-xs text-gray-600">
              {t('page_guidance', 'Page Guidance & Summary')}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 rounded hover:bg-primary-200 transition-colors"
            title={t('settings', 'Settings')}
          >
            <Settings className="h-4 w-4 text-gray-600" />
          </button>
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1.5 rounded hover:bg-primary-200 transition-colors"
            title={t('minimize', 'Minimize')}
          >
            <Minimize2 className="h-4 w-4 text-gray-600" />
          </button>
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1.5 rounded hover:bg-primary-200 transition-colors"
            title={t('close', 'Close')}
          >
            <X className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="space-y-3">
            <div>
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={useLlm}
                  onChange={(e) => setUseLlm(e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-gray-700">
                  {t('use_ai_summary', 'Use AI Summary (requires API key)')}
                </span>
              </label>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                {t('speech_rate', 'Speech Rate')}: {speechRate.toFixed(1)}x
              </label>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.1"
                value={speechRate}
                onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                {t('speech_pitch', 'Speech Pitch')}: {speechPitch.toFixed(1)}
              </label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={speechPitch}
                onChange={(e) => setSpeechPitch(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
            <span className="ml-2 text-sm text-gray-600">
              {t('loading_summary', 'Loading summary...')}
            </span>
          </div>
        ) : error || hasError ? (
          <div className="text-center py-4">
            <p className="text-sm text-red-600 mb-2">
              {errorMessage || t('error_loading_summary', 'Error loading summary')}
            </p>
            <button
              onClick={handleRefresh}
              className="text-xs text-primary-600 hover:text-primary-700 underline"
            >
              {t('retry', 'Retry')}
            </button>
          </div>
        ) : summary ? (
          <div className="space-y-3">
            <div className="text-xs text-gray-500 mb-2">
              {t('current_page', 'Current Page')}: <span className="font-semibold">{pageType}</span>
              {error && (
                <div className="text-red-500 text-xs mt-1">
                  Error: {error.message || 'Failed to load summary'}
                </div>
              )}
            </div>
            <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded border border-gray-200 max-h-48 overflow-y-auto">
              {summary}
            </div>
            {voiceWarning && (
              <div className="text-xs text-red-600 bg-red-50 p-3 rounded border border-red-200">
                <p className="font-semibold mb-1">⚠️ Language Voice Not Available</p>
                <p>{voiceWarning}</p>
                <p className="mt-2 text-gray-600">
                  The text will be read in English or phonetically, not in the selected language. 
                  Please install language packs or use a browser with native support for proper pronunciation.
                </p>
              </div>
            )}
            {!isSupported && (
              <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                ⚠️ Speech synthesis not supported. You can still read the summary above.
              </p>
            )}
            <div className="flex items-center justify-between">
              <button
                onClick={toggle}
                disabled={!summary || !isSupported}
                className={`
                  flex items-center space-x-2 px-4 py-2 rounded-lg
                  ${isPlaying
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-primary-500 hover:bg-primary-600 text-white'
                  }
                  transition-colors duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
                title={!isSupported ? 'Speech synthesis not supported in your browser' : ''}
              >
                {isPlaying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{t('stop', 'Stop')}</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="h-4 w-4" />
                    <span>{t('play', 'Play')}</span>
                  </>
                )}
              </button>
              <button
                onClick={handleRefresh}
                className="text-xs text-gray-600 hover:text-gray-800 underline"
                title={t('refresh_summary', 'Refresh summary')}
              >
                {t('refresh', 'Refresh')}
              </button>
            </div>
            {summaryData?.cached && (
              <p className="text-xs text-gray-500 text-center">
                {t('cached_summary', 'Cached summary')}
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-gray-600 mb-2">
              {t('no_summary_available', 'No summary available')}
            </p>
            <button
              onClick={handleRefresh}
              className="text-xs text-primary-600 hover:text-primary-700 underline"
            >
              {t('load_summary', 'Load Summary')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
