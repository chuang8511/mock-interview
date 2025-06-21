import React, { useState, useRef, useEffect } from 'react';

interface TextInputProps {
  onSubmit: (text: string) => void;
  disabled?: boolean;
}

const TextInput: React.FC<TextInputProps> = ({ onSubmit, disabled = false }) => {
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Focus on the textarea when component mounts
    if (textareaRef.current && !disabled) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  const handleSubmit = async () => {
    const trimmedText = text.trim();
    if (!trimmedText || disabled || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      onSubmit(trimmedText);
      setText('');
      // Focus back on textarea after sending
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  return (
    <div className="text-input">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleTextChange}
        onKeyPress={handleKeyPress}
        placeholder={
          disabled 
            ? "Not connected to server..." 
            : "Type your message here... (Press Enter to send, Shift+Enter for new line)"
        }
        disabled={disabled || isSubmitting}
        rows={3}
      />
      
      <button
        className="send-button"
        onClick={handleSubmit}
        disabled={disabled || isSubmitting || !text.trim()}
        title="Send message (Enter)"
      >
        {isSubmitting ? (
          <>
            <span>⏳</span>
            <span>Sending...</span>
          </>
        ) : (
          <>
            <span>📤</span>
            <span>Send</span>
          </>
        )}
      </button>
    </div>
  );
};

export default TextInput; 