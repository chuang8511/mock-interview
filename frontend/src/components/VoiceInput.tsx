import React from 'react';

interface VoiceInputProps {
  isListening: boolean;
  transcript: string;
  confidence?: number;
  error: string | null;
  isSupported: boolean;
  onToggleListening: () => void;
  disabled?: boolean;
}

const VoiceInput: React.FC<VoiceInputProps> = ({
  isListening,
  transcript,
  confidence = 0,
  error,
  isSupported,
  onToggleListening,
  disabled = false
}) => {
  if (!isSupported) {
    return (
      <div className="voice-input">
        <div className="voice-error">
          🎤❌ Voice input is not supported in this browser. Please use Chrome or Edge.
        </div>
      </div>
    );
  }

  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.8) return '#28a745'; // Green - high confidence
    if (conf >= 0.6) return '#ffc107'; // Yellow - medium confidence
    if (conf >= 0.4) return '#fd7e14'; // Orange - low confidence
    return '#dc3545'; // Red - very low confidence
  };

  const getConfidenceText = (conf: number) => {
    if (conf >= 0.8) return 'Excellent';
    if (conf >= 0.6) return 'Good';
    if (conf >= 0.4) return 'Fair';
    return 'Poor';
  };

  return (
    <div className="voice-input">
      <div className="voice-button-container">
        <button
          className={`voice-button ${isListening ? 'listening' : ''}`}
          onClick={onToggleListening}
          disabled={disabled}
          title={isListening ? 'Stop listening' : 'Start voice input'}
        >
          {isListening ? '🛑' : '🎤'}
        </button>
        
        {isListening && (
          <div className="voice-status">
            <div className="listening-indicator">
              <span className="pulse-dot"></span>
              <span>Listening...</span>
            </div>
            
            {confidence > 0 && (
              <div className="confidence-indicator">
                <span 
                  className="confidence-score"
                  style={{ color: getConfidenceColor(confidence) }}
                >
                  {getConfidenceText(confidence)} ({Math.round(confidence * 100)}%)
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="voice-instructions">
        {isListening ? (
          <div>
            <p>🎙️ <strong>Speak clearly into your microphone</strong></p>
            <p>💡 <em>Tips for better recognition:</em></p>
            <ul>
              <li>Speak at normal pace</li>
              <li>Use clear pronunciation</li>
              <li>Minimize background noise</li>
              <li>Speak technical terms clearly</li>
            </ul>
          </div>
        ) : (
          <p>Click the microphone button to start voice input</p>
        )}
      </div>

      {transcript && (
        <div className="voice-transcript">
          <div className="transcript-header">
            <strong>Transcript:</strong>
            {confidence > 0 && (
              <span 
                className="confidence-badge"
                style={{ 
                  backgroundColor: getConfidenceColor(confidence),
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.8rem',
                  marginLeft: '10px'
                }}
              >
                {Math.round(confidence * 100)}%
              </span>
            )}
          </div>
          <div className="transcript-content">
            {transcript}
          </div>
        </div>
      )}

      {error && (
        <div className="voice-error">
          ⚠️ {error}
          {error.includes('denied') && (
            <div className="error-help">
              <p><strong>To fix microphone access:</strong></p>
              <ol>
                <li>Click the microphone icon in your browser's address bar</li>
                <li>Select "Always allow" for this site</li>
                <li>Refresh the page and try again</li>
              </ol>
            </div>
          )}
        </div>
      )}

      {disabled && (
        <div className="voice-disabled">
          Voice input disabled - not connected to server
        </div>
      )}
    </div>
  );
};

export default VoiceInput; 