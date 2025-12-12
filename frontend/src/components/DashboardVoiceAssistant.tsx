/**
 * Dashboard Voice Assistant Component
 * Provides AI-powered voice summaries of dashboard information
 * Integrates with backend /api/v1/voice/summarize endpoint
 */
import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Volume2, VolumeX, Loader2, X, Maximize2, Minimize2, Settings } from 'lucide-react';
import { useTranslation } from '../contexts/TranslationContext';
import { voiceApi } from '../services/api';
import { selectVoiceForLanguage } from '../utils/voiceSelection';

interface DashboardVoiceAssistantProps {
  className?: string;
  autoPlay?: boolean;
}

export default function DashboardVoiceAssistant({ 
  className = '',
  autoPlay = false 
}: DashboardVoiceAssistantProps) {
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

  // Fetch summary from backend
  const { data: summaryData, isLoading, error, refetch } = useQuery({
    queryKey: ['voice-summary', language, useLlm],
    queryFn: () => voiceApi.getSummary(useLlm, language),
    enabled: true, // Always enabled, will fetch when component mounts
    staleTime: 3600000, // 1 hour - matches backend cache
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

  // Auto-play if enabled and summary is ready
  useEffect(() => {
    if (autoPlay && isSupported && summary && !isPlaying && !isMinimized) {
      speak();
    }
  }, [autoPlay, summary, isSupported]);

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
        // Wait a bit for cancellation to complete
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
          if (selectedVoice) {
            utterance.voice = selectedVoice;
            utterance.lang = selectedVoice.lang; // Use the voice's actual language
            console.log(`[DashboardVoiceAssistant] Using voice: ${selectedVoice.name} (${selectedVoice.lang}) for language: ${language}`);
          } else {
            console.warn(`[DashboardVoiceAssistant] No specific voice found for ${language}, using default`);
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
    setIsPlaying(false);
    utteranceRef.current = null;
  };

  const toggle = () => {
    if (isPlaying) {
      stop();
    } else {
      if (summary) {
        speak();
      } else {
        // Refetch if no summary
        refetch();
      }
    }
  };

  const handleRefresh = () => {
    stop();
    refetch();
  };

  if (!isSupported) {
    return null; // Don't show if browser doesn't support TTS
  }

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
    <div className={`fixed bottom-4 right-4 z-50 w-80 bg-white rounded-lg shadow-2xl border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-primary-100">
        <div className="flex items-center space-x-2">
          <Volume2 className="h-5 w-5 text-primary-600" />
          <h3 className="font-semibold text-gray-900 text-sm">
            {t('voice_assistant', 'Voice Assistant')}
          </h3>
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
            <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded border border-gray-200 max-h-32 overflow-y-auto">
              {summary}
            </div>
            <div className="flex items-center justify-between">
              <button
                onClick={toggle}
                disabled={!summary}
                className={`
                  flex items-center space-x-2 px-4 py-2 rounded-lg
                  ${isPlaying
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-primary-500 hover:bg-primary-600 text-white'
                  }
                  transition-colors duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
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

