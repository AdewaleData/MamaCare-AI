/**
 * Voice Selection Utility
 * Handles intelligent voice selection for different languages
 * Ensures different voices are used for different languages with proper fallbacks
 * Specifically targets Yoruba, Hausa, and Igbo voices
 */

/**
 * Get available voices from the browser
 * Note: Voices may not be immediately available, so we need to handle async loading
 */
export function getAvailableVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
      return;
    }

    // Voices may load asynchronously, wait for voiceschanged event
    const handleVoicesChanged = () => {
      const loadedVoices = window.speechSynthesis.getVoices();
      if (loadedVoices.length > 0) {
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
        resolve(loadedVoices);
      }
    };

    window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
    
    // Fallback timeout - if voices don't load within 2 seconds, return empty array
    setTimeout(() => {
      window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
      resolve(window.speechSynthesis.getVoices());
    }, 2000);
  });
}

/**
 * Language-specific voice matching criteria
 * Matches by language code and voice name keywords
 */
const languageVoiceCriteria: Record<string, {
  langCodes: string[];
  nameKeywords: string[];
  description: string;
}> = {
  'yo': {
    langCodes: ['yo-NG', 'yo'],
    nameKeywords: ['yoruba', 'yorùbá', 'yo'],
    description: 'Yoruba'
  },
  'ha': {
    langCodes: ['ha-NG', 'ha'],
    nameKeywords: ['hausa', 'ha'],
    description: 'Hausa'
  },
  'ig': {
    langCodes: ['ig-NG', 'ig'],
    nameKeywords: ['igbo', 'ig'],
    description: 'Igbo'
  },
  'en': {
    langCodes: ['en-US', 'en-GB', 'en-AU', 'en'],
    nameKeywords: ['english', 'en'],
    description: 'English'
  }
};

/**
 * Check if a voice matches the language criteria
 */
function voiceMatchesLanguage(voice: SpeechSynthesisVoice, language: string): boolean {
  const criteria = languageVoiceCriteria[language];
  if (!criteria) return false;

  const voiceLang = voice.lang.toLowerCase();
  const voiceName = voice.name.toLowerCase();

  // Check language code match
  const langMatch = criteria.langCodes.some(langCode => 
    voiceLang.startsWith(langCode.toLowerCase())
  );

  // Check name keyword match
  const nameMatch = criteria.nameKeywords.some(keyword => 
    voiceName.includes(keyword.toLowerCase())
  );

  return langMatch || nameMatch;
}

/**
 * Check if a voice actually supports the language properly
 * This is important because some voices may have the language code but not actually support it
 */
function voiceSupportsLanguage(voice: SpeechSynthesisVoice, language: string): boolean {
  const criteria = languageVoiceCriteria[language];
  if (!criteria) return false;

  const voiceLang = voice.lang.toLowerCase();
  const voiceName = voice.name.toLowerCase();

  // For Nigerian languages, we need STRICT matching - the voice MUST have the language code
  if (['yo', 'ha', 'ig'].includes(language)) {
    // Check if language code exactly matches (not just contains)
    const exactMatch = criteria.langCodes.some(langCode => {
      const langLower = langCode.toLowerCase();
      return voiceLang === langLower || voiceLang.startsWith(langLower + '-');
    });
    
    // Also check if voice name contains the language name
    const nameMatch = criteria.nameKeywords.some(keyword => 
      voiceName.includes(keyword.toLowerCase())
    );
    
    return exactMatch || nameMatch;
  }

  // For English, more lenient matching
  return criteria.langCodes.some(langCode => 
    voiceLang.startsWith(langCode.toLowerCase())
  ) || criteria.nameKeywords.some(keyword => 
    voiceName.includes(keyword.toLowerCase())
  );
}

/**
 * Select the best available voice for a given language
 * Prioritizes exact language matches, then falls back to English
 * @param language - Language code (en, ha, yo, ig)
 * @returns The best available voice or null if none found
 */
export async function selectVoiceForLanguage(language: string): Promise<SpeechSynthesisVoice | null> {
  const voices = await getAvailableVoices();
  
  if (voices.length === 0) {
    console.warn('[Voice Selection] No voices available');
    return null;
  }

  // Log all available voices for debugging
  console.log(`[Voice Selection] Available voices (${voices.length} total):`, 
    voices.map(v => `${v.name} (${v.lang})`).join(', '));

  const criteria = languageVoiceCriteria[language];
  if (!criteria) {
    console.warn(`[Voice Selection] Unknown language: ${language}, using English`);
    language = 'en';
  }

  // Strategy 1: Find exact language match with STRICT checking for Nigerian languages
  let matchedVoices = voices.filter(v => voiceSupportsLanguage(v, language));
  
  if (matchedVoices.length > 0) {
    // Prefer local service voices (usually better quality)
    let selected = matchedVoices.find(v => v.localService);
    
    if (!selected) {
      // If no local service, prefer default voice for that language
      selected = matchedVoices.find(v => v.default) || matchedVoices[0];
    }
    
    if (selected) {
      console.log(`[Voice Selection] ✅ Selected ${criteria.description} voice: ${selected.name} (${selected.lang})`);
      return selected;
    }
  }

  // Strategy 2: For Nigerian languages, if no native voice found, DO NOT use fallback
  // Instead, return null so the app can show a warning or use alternative TTS
  if (['yo', 'ha', 'ig'].includes(language)) {
    const availableLanguages = [...new Set(voices.map(v => v.lang))];
    console.error(`[Voice Selection] ❌ NO ${criteria.description.toUpperCase()} VOICE FOUND!`);
    console.error(`[Voice Selection] Available languages: ${availableLanguages.join(', ')}`);
    console.error(`[Voice Selection] The browser does not have a native ${criteria.description} voice installed.`);
    console.error(`[Voice Selection] Text will be read in English or phonetically, not in ${criteria.description}.`);
    console.error(`[Voice Selection] Consider using a cloud TTS service (Google Cloud TTS, Azure TTS, or AWS Polly) for proper ${criteria.description} support.`);
    
    // Return null to indicate no proper voice is available
    // The calling code should handle this and show a warning to the user
    return null;
  }

  // Strategy 3: Fallback to English (only for English language)
  const englishVoices = voices.filter(v => voiceMatchesLanguage(v, 'en'));
  if (englishVoices.length > 0) {
    const selected = englishVoices.find(v => v.localService) || englishVoices.find(v => v.default) || englishVoices[0];
    console.log(`[Voice Selection] Using English voice: ${selected?.name} (${selected?.lang})`);
    return selected || null;
  }

  // Strategy 4: Last resort - use default or first available voice
  const defaultVoice = voices.find(v => v.default) || voices[0];
  if (defaultVoice) {
    console.warn(`[Voice Selection] ⚠️ Using default/fallback voice: ${defaultVoice.name} (${defaultVoice.lang})`);
    return defaultVoice;
  }
  
  return null;
}

/**
 * Get voice info for debugging/logging
 */
export async function getVoiceInfo(language: string): Promise<{
  selected: SpeechSynthesisVoice | null;
  available: SpeechSynthesisVoice[];
  language: string;
  matchedVoices: SpeechSynthesisVoice[];
}> {
  const voices = await getAvailableVoices();
  const selected = await selectVoiceForLanguage(language);
  const criteria = languageVoiceCriteria[language];
  const matchedVoices = criteria ? voices.filter(v => voiceMatchesLanguage(v, language)) : [];
  
  return {
    selected,
    available: voices,
    language,
    matchedVoices
  };
}

/**
 * Check if a specific language is supported by available voices
 * Returns true only if a proper native voice exists
 */
export async function isLanguageSupported(language: string): Promise<boolean> {
  const voices = await getAvailableVoices();
  const criteria = languageVoiceCriteria[language];
  
  if (!criteria) return false;
  
  // Use strict checking for Nigerian languages
  return voices.some(v => voiceSupportsLanguage(v, language));
}

/**
 * Get a user-friendly message about voice availability
 */
export async function getVoiceAvailabilityMessage(language: string): Promise<{
  supported: boolean;
  message: string;
  availableVoices: string[];
}> {
  const voices = await getAvailableVoices();
  const criteria = languageVoiceCriteria[language];
  const supported = await isLanguageSupported(language);
  
  const availableVoices = voices
    .filter(v => voiceSupportsLanguage(v, language))
    .map(v => `${v.name} (${v.lang})`);
  
  let message = '';
  if (supported) {
    message = `${criteria?.description || language} voice is available.`;
  } else {
    if (['yo', 'ha', 'ig'].includes(language)) {
      message = `⚠️ Your browser does not have a native ${criteria?.description || language} voice installed. The text will be read in English or phonetically, not in ${criteria?.description || language}. To get proper ${criteria?.description || language} pronunciation, please install language packs or use a browser with native support.`;
    } else {
      message = `${criteria?.description || language} voice is not available.`;
    }
  }
  
  return {
    supported,
    message,
    availableVoices
  };
}

/**
 * List all available voices grouped by language
 */
export async function listAvailableVoicesByLanguage(): Promise<Record<string, SpeechSynthesisVoice[]>> {
  const voices = await getAvailableVoices();
  const grouped: Record<string, SpeechSynthesisVoice[]> = {};
  
  voices.forEach(voice => {
    const lang = voice.lang.split('-')[0]; // Get base language code
    if (!grouped[lang]) {
      grouped[lang] = [];
    }
    grouped[lang].push(voice);
  });
  
  return grouped;
}

/**
 * Use cloud TTS for Nigerian languages when browser voices aren't available
 * Returns audio URL or null
 */
export async function useCloudTTS(text: string, language: string): Promise<string | null> {
  try {
    // Import the API dynamically to avoid circular dependencies
    const { voiceApi } = await import('../services/api');
    
    // Check if cloud TTS is available
    const status = await voiceApi.getTtsStatus();
    if (!status.available) {
      console.warn('[Cloud TTS] Service not available');
      return null;
    }
    
    // Generate speech audio
    const audioBlob = await voiceApi.generateSpeech(text, language);
    
    // Create object URL for the audio blob
    const audioUrl = URL.createObjectURL(audioBlob);
    console.log(`[Cloud TTS] Generated native ${language} voice audio`);
    return audioUrl;
  } catch (error) {
    console.error('[Cloud TTS] Error generating speech:', error);
    return null;
  }
}

