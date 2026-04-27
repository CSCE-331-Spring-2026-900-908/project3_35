import { useCallback, useEffect, useState } from 'react';

const LANGUAGE_TO_VOICE_LANG = {
  en: 'en-US',
  es: 'es-ES',
  'zh-CN': 'zh-CN',
  ko: 'ko-KR'
};

const TTS_RATE = 1.4;

function cleanSpeechText(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .replace(/[•]/g, ', ')
    .trim();
}

export default function useTextToSpeech(language) {
  const [ttsEnabled, setTtsEnabled] = useState(false);

  const cancelSpeech = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

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

  function toggleTts() {
    setTtsEnabled((current) => {
      const next = !current;

      if (!next) {
        cancelSpeech();
      }

      return next;
    });
  }

  useEffect(() => {
    return () => {
      cancelSpeech();
    };
  }, [cancelSpeech]);

  return {
    ttsEnabled,
    toggleTts,
    speak,
    speakNow,
    cancelSpeech
  };
}