import React from 'react';

interface Message {
  id: string;
  type: string;
  content: string;
  timestamp: number;
  sender: 'user' | 'ai' | 'system';
}

interface MessageListProps {
  messages: Message[];
}

const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getMessageClassName = (message: Message) => {
    let baseClass = 'message';
    
    switch (message.sender) {
      case 'user':
        return `${baseClass} message-user`;
      case 'ai':
        return `${baseClass} message-ai`;
      case 'system':
        if (message.type === 'error') {
          return `${baseClass} message-error`;
        } else if (message.type === 'step_change') {
          return `${baseClass} message-system step_change`;
        } else if (message.type === 'step_control') {
          return `${baseClass} message-system step_control`;
        } else {
          return `${baseClass} message-system`;
        }
      default:
        return `${baseClass} message-system`;
    }
  };

  const getMessageIcon = (message: Message) => {
    switch (message.sender) {
      case 'user':
        return message.type === 'voice_input' ? '🎤' : '💬';
      case 'ai':
        return '🤖';
      case 'system':
        if (message.type === 'error') {
          return '❌';
        } else if (message.type === 'step_change') {
          return '🔄';
        } else if (message.type === 'step_control') {
          if (message.content.includes('⏭️')) {
            return '⏭️';
          } else if (message.content.includes('🤖')) {
            return '🤖';
          } else {
            return '📋';
          }
        } else {
          return 'ℹ️';
        }
      default:
        return 'ℹ️';
    }
  };

  if (messages.length === 0) {
    return (
      <div className="messages-list">
        <div className="message message-system">
          <div>Welcome to Mock Interview Assistant! 👋</div>
          <div>Click "Start Interview" to begin your coding interview practice.</div>
          <div className="message-timestamp">
            {formatTime(Date.now())}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="messages-list">
      {messages.map((message) => (
        <div key={message.id} className={getMessageClassName(message)}>
          <div className="message-content">
            <span className="message-icon">{getMessageIcon(message)}</span>
            <span className="message-text">{message.content}</span>
          </div>
          <div className="message-timestamp">
            {formatTime(message.timestamp)}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MessageList; 