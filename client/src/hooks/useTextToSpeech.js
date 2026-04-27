// Imports React hooks used to store TTS state, memoize functions, and clean up speech on unmount.
import { useCallback, useEffect, useState } from 'react';

// Maps the app's language codes to browser speech synthesis language codes.
const LANGUAGE_TO_VOICE_LANG = {
  en: 'en-US',
  es: 'es-ES',
  'zh-CN': 'zh-CN',
  ko: 'ko-KR'
};

// Controls the speed of the spoken text.
// This is set faster than the default because screen reader users are often used to faster speech.
const TTS_RATE = 1.4;

// Cleans text before speaking it so the voice output sounds more natural.
function cleanSpeechText(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .replace(/[•]/g, ', ')
    .trim();
}

// Custom hook that manages TTS state and exposes functions for speaking or canceling speech.
export default function useTextToSpeech(language) {
  // Tracks whether TTS is currently enabled.
  const [ttsEnabled, setTtsEnabled] = useState(false);

  // Stops any speech currently playing.
  const cancelSpeech = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  // Speaks text only when TTS is enabled.
  const speak = useCallback(
    (text) => {
      if (!ttsEnabled) {
        return;
      }

      if (!('speechSynthesis' in window)) {
        console.warn('Text-to-speech is not supported in this browser.');
        return;
      }

      const cleanedText = cleanSpeechText(text);

      if (!cleanedText) {
        return;
      }

      // Cancels the previous speech so new actions do not overlap with old audio.
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(cleanedText);
      utterance.lang = LANGUAGE_TO_VOICE_LANG[language] || 'en-US';
      utterance.rate = TTS_RATE;
      utterance.pitch = 1;
      utterance.volume = 1;

      window.speechSynthesis.speak(utterance);
    },
    [language, ttsEnabled]
  );

  // Speaks text immediately, even if TTS has not finished updating its enabled state yet.
  // This is useful right after turning TTS on.
  const speakNow = useCallback(
    (text) => {
      if (!('speechSynthesis' in window)) {
        console.warn('Text-to-speech is not supported in this browser.');
        return;
      }

      const cleanedText = cleanSpeechText(text);

      if (!cleanedText) {
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(cleanedText);
      utterance.lang = LANGUAGE_TO_VOICE_LANG[language] || 'en-US';
      utterance.rate = TTS_RATE;
      utterance.pitch = 1;
      utterance.volume = 1;

      window.speechSynthesis.speak(utterance);
    },
    [language]
  );

  // Toggles TTS on or off.
  // If TTS is turned off, any current speech is immediately stopped.
  function toggleTts() {
    setTtsEnabled((current) => {
      const next = !current;

      if (!next) {
        cancelSpeech();
      }

      return next;
    });
  }

  // Stops speech when the component using this hook unmounts.
  useEffect(() => {
    return () => {
      cancelSpeech();
    };
  }, [cancelSpeech]);

  // Exposes the TTS state and helper functions to the component using this hook.
  return {
    ttsEnabled,
    toggleTts,
    speak,
    speakNow,
    cancelSpeech
  };
}