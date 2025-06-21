import React from 'react';

interface VoiceOutputProps {
  isSpeaking: boolean;
  isPaused: boolean;
  isSupported: boolean;
  error: string | null;
  queueLength: number;
  autoPlay: boolean;
  onToggle: () => void;
  onSpeakLatest?: () => void;
  disabled?: boolean;
}

const VoiceOutput: React.FC<VoiceOutputProps> = ({
  isSpeaking,
  isPaused,
  isSupported,
  error,
  queueLength,
  autoPlay,
  onToggle,
  onSpeakLatest,
  disabled = false
}) => {
  if (!isSupported) {
    return (
      <div className="voice-output">
        <div className="voice-output-error">
          🔇 Text-to-speech not supported in this browser
        </div>
      </div>
    );
  }

  return (
    <div className="voice-output">
      <div className="voice-output-controls">
        <button
          className={`voice-control-button ${isSpeaking ? 'speaking' : ''} ${isPaused ? 'paused' : ''}`}
          onClick={onToggle}
          disabled={disabled || (!isSpeaking && !isPaused)}
          title={
            isPaused 
              ? 'Resume AI voice' 
              : isSpeaking 
                ? 'Pause AI voice' 
                : 'No speech active'
          }
        >
          {isPaused ? '▶️' : isSpeaking ? '⏸️' : '🔊'}
        </button>

        <div className="voice-status">
          {isSpeaking && !isPaused && (
            <span className="status-speaking">🎙️ AI Speaking</span>
          )}
          {isPaused && (
            <span className="status-paused">⏸️ Paused</span>
          )}
          {!isSpeaking && !isPaused && queueLength > 0 && (
            <span className="status-queued">⏳ Queued ({queueLength})</span>
          )}
          {!isSpeaking && !isPaused && queueLength === 0 && (
            <span className="status-idle">🔇 Quiet</span>
          )}
        </div>
      </div>

      {error && (
        <div className="voice-output-error">
          ⚠️ {error}
        </div>
      )}

      {disabled && (
        <div className="voice-output-disabled">
          Voice output disabled - not connected
        </div>
      )}
    </div>
  );
};

export default VoiceOutput; 