import React from 'react';

interface StatusBarProps {
  isConnected: boolean;
  sessionId: string | null;
  interviewStarted: boolean;
  onStartInterview: () => void;
  onEndInterview: () => void;
}

const StatusBar: React.FC<StatusBarProps> = ({
  isConnected,
  sessionId,
  interviewStarted,
  onStartInterview,
  onEndInterview
}) => {
  return (
    <div className="status-bar">
      <div className="connection-status">
        <div className={`status-indicator ${isConnected ? 'status-connected' : 'status-disconnected'}`} />
        <span>
          {isConnected ? 'Connected' : 'Disconnected'}
          {sessionId && ` (${sessionId.slice(0, 8)}...)`}
        </span>
      </div>
      
      <div className="interview-controls">
        <button
          className="control-button start-button"
          onClick={onStartInterview}
          disabled={!isConnected || interviewStarted}
        >
          🚀 Start Interview
        </button>
        
        <button
          className="control-button end-button"
          onClick={onEndInterview}
          disabled={!isConnected || !interviewStarted}
        >
          ⏹️ End Interview
        </button>
      </div>
    </div>
  );
};

export default StatusBar; 