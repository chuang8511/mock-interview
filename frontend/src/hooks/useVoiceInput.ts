import { useState, useEffect, useRef, useCallback } from 'react';

interface VoiceInputOptions {
  continuous?: boolean;
  interimResults?: boolean;
  language?: string;
  maxAlternatives?: number;
  grammars?: any[];
}

// Helper function to fix common auto-corrections of technical terms
const fixTechnicalTerms = (text: string): string => {
  const corrections: { [key: string]: string } = {
    // Big O notation fixes
    'break': 'big O',
    'big break': 'big O',
    'means': 'O(n)',
    'being': 'O(n)',
    'bean': 'O(n)',
    'been': 'O(n)',
    'oh of': 'O of',
    'oh one': 'O(1)',
    'oh n': 'O(n)',
    'oh log n': 'O(log n)',
    'oh n squared': 'O(n²)',
    'oh n square': 'O(n²)',
    
    // Common algorithm term fixes
    'binary surge': 'binary search',
    'hash stable': 'hash table',
    'link list': 'linked list',
    'dynamic program': 'dynamic programming',
    'time complex': 'time complexity',
    'space complex': 'space complexity',
    'data struck': 'data structure',
    'data structures': 'data structure',
    
    // Other common fixes
    'algorithm': 'algorithm', // Preserve correct spelling
    'recursion': 'recursion', // Preserve correct spelling
  };

  let fixedText = text;
  
  // Apply corrections (case-insensitive)
  Object.entries(corrections).forEach(([wrong, correct]) => {
    const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
    fixedText = fixedText.replace(regex, correct);
  });
  
  return fixedText;
};

export const useVoiceInput = (
  onTranscript: (transcript: string, isFinal: boolean) => void,
  options: VoiceInputOptions = {}
) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    continuous = true,
    interimResults = true,
    language = 'en-US',
    maxAlternatives = 3,
    grammars = []
  } = options;

  // Check for browser support and setup recognition
  useEffect(() => {
    const SpeechRecognition = 
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setIsSupported(true);
      setupRecognition(SpeechRecognition);
    } else {
      setIsSupported(false);
      setError('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
    }
  }, [continuous, interimResults, language, maxAlternatives]);

  const setupRecognition = useCallback((SpeechRecognition: any) => {
    recognitionRef.current = new SpeechRecognition();
    
    // Enhanced configuration for better accuracy and less auto-correction
    recognitionRef.current.continuous = continuous;
    recognitionRef.current.interimResults = interimResults;
    recognitionRef.current.lang = language;
    recognitionRef.current.maxAlternatives = Math.max(maxAlternatives, 5); // Get more alternatives
    
    // Reduce auto-correction and improve technical accuracy
    if ('webkitSpeechRecognition' in window) {
      // Chrome-specific optimizations for technical content
      try {
        // Disable auto-correction features that change technical terms
        recognitionRef.current.serviceURI = 'wss://www.google.com/speech-api/v2/recognize';
        
        // Set additional Chrome-specific parameters for better technical recognition
        if (recognitionRef.current.serviceURI) {
          // These help reduce auto-correction
          recognitionRef.current.interim = true;
          recognitionRef.current.profanityFilter = false; // Don't filter technical terms
        }
      } catch (error) {
        console.log('Advanced speech recognition features not available:', error);
      }
    }

    // Enhanced grammar for technical terms (if supported)
    if (grammars.length > 0 && 'webkitSpeechGrammarList' in window) {
      const speechRecognitionList = new (window as any).webkitSpeechGrammarList();
      grammars.forEach(grammar => {
        speechRecognitionList.addFromString(grammar, 1);
      });
      recognitionRef.current.grammars = speechRecognitionList;
    }
  }, [continuous, interimResults, language, maxAlternatives, grammars]);

  const stopListening = useCallback(() => {
    // Clear all timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
    
    setIsListening(false);
  }, [isListening]);

  const startListening = useCallback(() => {
    if (!isSupported || !recognitionRef.current) {
      setError('Speech recognition is not available');
      return;
    }

    if (isListening) {
      return; // Already listening
    }

    setError(null);
    setTranscript('');
    setConfidence(0);
    setIsListening(true);

    recognitionRef.current.onstart = () => {
      console.log('Voice recognition started');
      setIsListening(true);
      setError(null);
    };

    recognitionRef.current.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';
      let bestConfidence = 0;

      // Technical terms that should be preserved
      const technicalTerms = [
        'big o', 'big oh', 'o of n', 'o of one', 'o of log n', 'o of n squared',
        'time complexity', 'space complexity', 'algorithm', 'data structure',
        'binary search', 'linked list', 'hash table', 'dynamic programming',
        'recursion', 'iteration', 'array', 'tree', 'graph', 'stack', 'queue'
      ];

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        
        // Enhanced alternative selection logic
        let bestAlternative = result[0];
        let bestAlternativeConfidence = result[0].confidence || 0;
        let bestScore = 0;
        
        // Check all alternatives and score them
        for (let j = 0; j < result.length; j++) {
          const alternative = result[j];
          const altConfidence = alternative.confidence || 0;
          const transcriptText = alternative.transcript.toLowerCase();
          
          // Calculate score based on confidence and technical term presence
          let score = altConfidence;
          
          // Boost score if it contains technical terms
          const technicalTermCount = technicalTerms.filter(term => 
            transcriptText.includes(term)
          ).length;
          
          if (technicalTermCount > 0) {
            score += technicalTermCount * 0.2; // Boost for technical terms
          }
          
          // Penalize if it contains common auto-corrections of technical terms
          const badCorrections = ['break', 'means', 'bean', 'being', 'been'];
          const hasBadCorrection = badCorrections.some(bad => transcriptText.includes(bad));
          if (hasBadCorrection && technicalTermCount === 0) {
            score -= 0.3; // Penalize likely auto-corrections
          }
          
          if (score > bestScore) {
            bestAlternative = alternative;
            bestAlternativeConfidence = altConfidence;
            bestScore = score;
          }
        }

        const transcriptText = bestAlternative.transcript;
        bestConfidence = Math.max(bestConfidence, bestAlternativeConfidence);

        if (result.isFinal) {
          finalTranscript += transcriptText;
        } else {
          interimTranscript += transcriptText;
        }
      }

      const currentTranscript = finalTranscript || interimTranscript;
      setTranscript(currentTranscript);
      setConfidence(bestConfidence);

      if (finalTranscript && finalTranscript.trim()) {
        console.log(`Final transcript: "${finalTranscript}" (confidence: ${bestConfidence})`);
        
        // Apply technical term corrections
        const correctedTranscript = fixTechnicalTerms(finalTranscript.trim());
        console.log(`Corrected transcript: "${correctedTranscript}"`);
        
        onTranscript(correctedTranscript, true);
        
        if (!continuous) {
          stopListening();
        } else {
          // Clear interim transcript after final result
          setTranscript('');
        }
      } else if (interimResults && interimTranscript && interimTranscript.trim()) {
        // Also apply corrections to interim results
        const correctedInterim = fixTechnicalTerms(interimTranscript.trim());
        onTranscript(correctedInterim, false);
      }
    };

    recognitionRef.current.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      
      switch (event.error) {
        case 'no-speech':
          setError('No speech detected. Please speak clearly into your microphone.');
          // Auto-restart for continuous mode
          if (continuous && isListening) {
            restartTimeoutRef.current = setTimeout(() => {
              if (isListening) {
                console.log('Restarting recognition after no-speech');
                recognitionRef.current?.start();
              }
            }, 1000);
          }
          break;
        case 'network':
          setError('Network error. Please check your internet connection.');
          setIsListening(false);
          break;
        case 'not-allowed':
          setError('Microphone access denied. Please allow microphone access and try again.');
          setIsListening(false);
          break;
        case 'service-not-allowed':
          setError('Speech recognition service not allowed. Please try again.');
          setIsListening(false);
          break;
        case 'aborted':
          // Normal abort, don't show error
          setIsListening(false);
          break;
        case 'audio-capture':
          setError('No microphone found. Please connect a microphone.');
          setIsListening(false);
          break;
        case 'bad-grammar':
          setError('Speech recognition grammar error.');
          setIsListening(false);
          break;
        default:
          setError(`Speech recognition error: ${event.error}`);
          setIsListening(false);
      }
    };

    recognitionRef.current.onend = () => {
      console.log('Voice recognition ended');
      
      // Auto-restart for continuous mode (unless manually stopped)
      if (continuous && isListening) {
        console.log('Auto-restarting continuous recognition');
        restartTimeoutRef.current = setTimeout(() => {
          if (isListening && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (error) {
              console.error('Failed to restart recognition:', error);
              setIsListening(false);
            }
          }
        }, 100);
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current.onspeechstart = () => {
      console.log('Speech detected');
      setError(null);
    };

    recognitionRef.current.onspeechend = () => {
      console.log('Speech ended');
    };

    recognitionRef.current.onsoundstart = () => {
      console.log('Sound detected');
    };

    recognitionRef.current.onsoundend = () => {
      console.log('Sound ended');
    };

    try {
      recognitionRef.current.start();
      
      // Auto-stop timeout for non-continuous mode
      if (!continuous) {
        timeoutRef.current = setTimeout(() => {
          stopListening();
        }, 15000); // Increased to 15 seconds
      }
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      setError('Failed to start voice recognition. Please try again.');
      setIsListening(false);
    }
  }, [isSupported, isListening, onTranscript, continuous, interimResults, stopListening]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      if (recognitionRef.current && isListening) {
        recognitionRef.current.stop();
      }
    };
  }, [isListening]);

  return {
    isListening,
    isSupported,
    transcript,
    confidence,
    error,
    startListening,
    stopListening,
    toggleListening
  };
}; 