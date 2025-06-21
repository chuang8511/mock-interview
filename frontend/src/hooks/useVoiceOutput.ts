import { useState, useEffect, useRef, useCallback } from 'react';

interface VoiceOutputOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  voice?: string;
  autoPlay?: boolean;
}

export const useVoiceOutput = (options: VoiceOutputOptions = {}) => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const queueRef = useRef<string[]>([]);
  const isProcessingRef = useRef(false);
  const currentTextRef = useRef<string | null>(null);
  const previousSettingsRef = useRef({ rate: options.rate, pitch: options.pitch, volume: options.volume, voice: options.voice });

  const {
    rate = 1,
    pitch = 1,
    volume = 1,
    voice = '',
    autoPlay = true
  } = options;

  // Check for browser support and load voices
  useEffect(() => {
    if ('speechSynthesis' in window) {
      setIsSupported(true);
      console.log('Text-to-speech is supported');
      
      const loadVoices = () => {
        const availableVoices = speechSynthesis.getVoices();
        console.log('Available voices:', availableVoices.length);
        setVoices(availableVoices);
      };

      loadVoices();
      speechSynthesis.onvoiceschanged = loadVoices;
    } else {
      setIsSupported(false);
      setError('Text-to-speech is not supported in this browser.');
      console.error('Text-to-speech is not supported');
    }

    return () => {
      if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
      }
    };
  }, []);

  const processQueue = useCallback(() => {
    console.log('processQueue called, isProcessing:', isProcessingRef.current, 'queue length:', queueRef.current.length, 'isPaused:', isPaused);
    
    // Don't process if paused
    if (isProcessingRef.current || queueRef.current.length === 0 || isPaused) {
      return;
    }

    isProcessingRef.current = true;
    const text = queueRef.current.shift()!;
    currentTextRef.current = text; // Track current text for settings changes
    
    console.log('Processing speech for text:', text.substring(0, 50) + '...');

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;

      // Configure voice settings
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = volume;

      // Set voice if specified
      if (voice && voices.length > 0) {
        const selectedVoice = voices.find(v => 
          v.name.toLowerCase().includes(voice.toLowerCase()) ||
          v.lang.toLowerCase().includes(voice.toLowerCase())
        );
        if (selectedVoice) {
          utterance.voice = selectedVoice;
          console.log('Using selected voice:', selectedVoice.name);
        }
      } else if (voices.length > 0) {
        // Try to find a good English voice
        const englishVoice = voices.find(v => 
          v.lang.startsWith('en') && v.name.toLowerCase().includes('female')
        ) || voices.find(v => v.lang.startsWith('en'));
        
        if (englishVoice) {
          utterance.voice = englishVoice;
          console.log('Using English voice:', englishVoice.name);
        }
      }

      utterance.onstart = () => {
        console.log('Speech synthesis started');
        setIsSpeaking(true);
        setIsPaused(false);
        setError(null);
      };

      utterance.onend = () => {
        console.log('Speech synthesis ended');
        setIsSpeaking(false);
        setIsPaused(false);
        isProcessingRef.current = false;
        utteranceRef.current = null;
        currentTextRef.current = null;
        
        // Process next item in queue
        setTimeout(processQueue, 100);
      };

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event.error);
        setError(`Speech synthesis error: ${event.error}`);
        setIsSpeaking(false);
        setIsPaused(false);
        isProcessingRef.current = false;
        utteranceRef.current = null;
        currentTextRef.current = null;
        
        // Continue with next item in queue
        setTimeout(processQueue, 100);
      };

      utterance.onpause = () => {
        console.log('Speech synthesis paused');
        setIsPaused(true);
      };

      utterance.onresume = () => {
        console.log('Speech synthesis resumed');
        setIsPaused(false);
      };

      console.log('Starting speech synthesis...');
      speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('Failed to create speech utterance:', error);
      setError('Failed to create speech utterance');
      isProcessingRef.current = false;
      setTimeout(processQueue, 100);
    }
  }, [rate, pitch, volume, voice, voices, isPaused]);

  // Watch for voice settings changes and restart speech if currently speaking
  useEffect(() => {
    const prevSettings = previousSettingsRef.current;
    const currentSettings = { rate, pitch, volume, voice };
    
    // Check if any settings have changed
    const settingsChanged = 
      prevSettings.rate !== rate ||
      prevSettings.pitch !== pitch ||
      prevSettings.volume !== volume ||
      prevSettings.voice !== voice;
    
    if (settingsChanged && isSpeaking && currentTextRef.current) {
      console.log('Voice settings changed while speaking, restarting with new settings...');
      
      // Cancel current speech
      speechSynthesis.cancel();
      
      // Restart with current text and new settings
      const textToRestart = currentTextRef.current;
      
      // Reset state
      setIsSpeaking(false);
      setIsPaused(false);
      isProcessingRef.current = false;
      utteranceRef.current = null;
      
      // Clear queue and add current text back
      queueRef.current = [textToRestart];
      
      // Process with new settings
      setTimeout(() => {
        processQueue();
      }, 100);
    }
    
    // Update previous settings
    previousSettingsRef.current = currentSettings;
  }, [rate, pitch, volume, voice, isSpeaking, processQueue]);

  const cleanTextForSpeech = (text: string): string => {
    return text
      // Remove URLs (http/https)
      .replace(/https?:\/\/[^\s]+/g, '')
      // Remove markdown links [text](url)
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove markdown bold/italic
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      // Remove markdown headers
      .replace(/^#{1,6}\s+/gm, '')
      // Remove code blocks and inline code
      .replace(/```[\s\S]*?```/g, 'code block')
      .replace(/`([^`]+)`/g, '$1')
      // Remove markdown list markers
      .replace(/^\s*[-*+]\s+/gm, '')
      .replace(/^\s*\d+\.\s+/gm, '')
      // Clean up "Problem from:" lines
      .replace(/Problem from:\s*https?:\/\/[^\s]+/gi, '')
      // Remove extra whitespace and normalize
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '. ')
      .replace(/\n/g, '. ')
      .trim();
  };

  const speak = useCallback((text: string, immediate: boolean = false) => {
    console.log('speak() called with autoPlay:', autoPlay, 'isSupported:', isSupported);
    
    if (!isSupported) {
      setError('Text-to-speech is not supported');
      return false;
    }

    if (!text.trim()) {
      console.log('Empty text, not speaking');
      return false;
    }

    // Clean up the text for better speech
    const cleanText = cleanTextForSpeech(text);
    console.log('Cleaned text for speech:', cleanText.substring(0, 100) + '...');

    if (immediate) {
      // Stop current speech and clear queue
      stop();
      queueRef.current = [cleanText];
    } else {
      // Add to queue
      queueRef.current.push(cleanText);
    }

    console.log('Queue length after adding:', queueRef.current.length);

    // Always try to process the queue, regardless of autoPlay setting
    // The autoPlay setting is handled in the component level
    processQueue();

    return true;
  }, [isSupported, processQueue, autoPlay]);

  const pause = useCallback(() => {
    if (speechSynthesis.speaking && !speechSynthesis.paused) {
      // Store the current utterance text for resuming
      if (utteranceRef.current) {
        const currentText = utteranceRef.current.text;
        // Stop current speech
        speechSynthesis.cancel();
        // Store the text for resume
        queueRef.current.unshift(currentText);
        setIsPaused(true);
        setIsSpeaking(false);
        isProcessingRef.current = false;
        utteranceRef.current = null;
      }
    }
  }, []);

  const resume = useCallback(() => {
    if (isPaused && queueRef.current.length > 0) {
      setIsPaused(false);
      processQueue();
    }
  }, [isPaused, processQueue]);

  const stop = useCallback(() => {
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }
    queueRef.current = [];
    isProcessingRef.current = false;
    setIsSpeaking(false);
    setIsPaused(false);
    utteranceRef.current = null;
    currentTextRef.current = null; // Clear current text when stopping
  }, []);

  const toggle = useCallback(() => {
    if (isSpeaking && !isPaused) {
      pause();
    } else if (isPaused) {
      resume();
    }
  }, [isSpeaking, isPaused, pause, resume]);

  const getPreferredVoice = useCallback(() => {
    if (voices.length === 0) return null;
    
    // Try to find a good English female voice
    return voices.find(v => 
      v.lang.startsWith('en') && 
      (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('woman'))
    ) || voices.find(v => v.lang.startsWith('en')) || voices[0];
  }, [voices]);

  return {
    isSupported,
    isSpeaking,
    isPaused,
    voices,
    error,
    speak,
    pause,
    resume,
    stop,
    toggle,
    getPreferredVoice,
    queueLength: queueRef.current.length
  };
}; 