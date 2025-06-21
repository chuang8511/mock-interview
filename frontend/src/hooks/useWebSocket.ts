import { useState, useEffect, useRef, useCallback } from 'react';

interface Message {
  id: string;
  type: string;
  content: string;
  timestamp: number;
  sender: 'user' | 'ai' | 'system';
  currentStep?: string;
}

interface WebSocketMessage {
  type: string;
  payload: any;
  sessionId?: string;
}

export const useWebSocket = (url: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<string>('problem_explanation');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectingRef = useRef(false);

  const addMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message]);
  }, []);

  const sendMessage = useCallback((type: string, payload: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = {
        type,
        payload,
        sessionId: sessionId || undefined
      };
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, [sessionId]);

  const connectWebSocket = useCallback(() => {
    // Prevent multiple simultaneous connections
    if (isConnectingRef.current || (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING)) {
      console.log('Connection already in progress, skipping...');
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('Already connected, skipping...');
      return;
    }

    isConnectingRef.current = true;
    console.log('Attempting to connect to WebSocket...');

    try {
      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected successfully');
        isConnectingRef.current = false;
        setIsConnected(true);
        // Don't show connection message in chat - it's visible in status bar
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          console.log('Received WebSocket message:', data);

          switch (data.type) {
            case 'session_control':
              if (data.payload.sessionId) {
                setSessionId(data.payload.sessionId);
              }
              // Only show important session messages, not routine ones
              if (data.payload.message && !data.payload.message.includes('connected') && !data.payload.message.includes('Interview started')) {
                addMessage({
                  id: Date.now().toString(),
                  type: 'system',
                  content: data.payload.message,
                  timestamp: Date.now(),
                  sender: 'system'
                });
              }
              break;

            case 'ai_response':
              addMessage({
                id: Date.now().toString(),
                type: 'ai_response',
                content: data.payload.text,
                timestamp: Date.now(),
                sender: 'ai',
                currentStep: data.payload.currentStep
              });
              
              // Update current step if provided
              if (data.payload.currentStep) {
                setCurrentStep(data.payload.currentStep);
              }
              
              // Note: Removed step change notifications to keep chat clean
              break;

            case 'step_control':
              if (data.payload.currentStep) {
                setCurrentStep(data.payload.currentStep);
              }
              
              // Note: Removed step change messages to keep chat clean
              // Step changes still happen, just not displayed in chat
              break;

            case 'error':
              addMessage({
                id: Date.now().toString(),
                type: 'error',
                content: data.payload.message || 'An error occurred',
                timestamp: Date.now(),
                sender: 'system'
              });
              break;

            default:
              console.log('Unknown message type:', data.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        isConnectingRef.current = false;
        setIsConnected(false);
        setSessionId(null);
        
        // Only show disconnect message if it wasn't a clean close and there's an actual error
        if (event.code !== 1000 && event.code !== 1001) {
          addMessage({
            id: Date.now().toString(),
            type: 'system',
            content: 'Connection lost - attempting to reconnect...',
            timestamp: Date.now(),
            sender: 'system'
          });

          // Only reconnect if it wasn't a clean close and we're not already trying to connect
          if (!isConnectingRef.current) {
            reconnectTimeoutRef.current = setTimeout(() => {
              console.log('Attempting to reconnect...');
              connectWebSocket();
            }, 3000);
          }
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        isConnectingRef.current = false;
        addMessage({
          id: Date.now().toString(),
          type: 'error',
          content: 'Connection error occurred',
          timestamp: Date.now(),
          sender: 'system'
        });
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      isConnectingRef.current = false;
      addMessage({
        id: Date.now().toString(),
        type: 'error',
        content: 'Failed to connect to server',
        timestamp: Date.now(),
        sender: 'system'
      });
    }
  }, [url, addMessage]);

  const disconnect = useCallback(() => {
    console.log('Disconnecting WebSocket...');
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    isConnectingRef.current = false;
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnect');
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setSessionId(null);
  }, []);

  // Initialize connection once
  useEffect(() => {
    connectWebSocket();

    return () => {
      disconnect();
    };
  }, []); // Empty dependency array to run only once

  const sendTextMessage = useCallback((text: string) => {
    if (text.trim()) {
      // Add user message to local state immediately
      addMessage({
        id: Date.now().toString(),
        type: 'text_input',
        content: text,
        timestamp: Date.now(),
        sender: 'user'
      });

      // Send to server
      return sendMessage('text_input', { text: text.trim() });
    }
    return false;
  }, [sendMessage, addMessage]);

  const sendVoiceMessage = useCallback((transcript: string, isFinal: boolean = true) => {
    if (transcript.trim() && isFinal) {
      // Add user message to local state immediately
      addMessage({
        id: Date.now().toString(),
        type: 'voice_input',
        content: transcript,
        timestamp: Date.now(),
        sender: 'user'
      });

      // Send to server
      return sendMessage('voice_input', { 
        transcript: transcript.trim(), 
        isFinal 
      });
    }
    return false;
  }, [sendMessage, addMessage]);

  const sendCodeMessage = useCallback((code: string, language: string) => {
    if (code.trim()) {
      // Add user message to local state immediately
      const message = {
        id: Date.now().toString(),
        type: 'code_input',
        content: `Submitted ${language} code:\n\`\`\`${language}\n${code}\n\`\`\``,
        timestamp: Date.now(),
        sender: 'user' as const
      };
      
      addMessage(message);

      // Send to server
      return sendMessage('code_input', { 
        code: code.trim(), 
        language 
      });
    }
    return false;
  }, [sendMessage, addMessage]);

  const sendStepControl = useCallback((action: string, step?: string) => {
    return sendMessage('step_control', { action, step });
  }, [sendMessage]);

  const startInterview = useCallback((problemConfig?: any) => {
    return sendMessage('session_control', { action: 'start', problemConfig });
  }, [sendMessage]);

  const endInterview = useCallback(() => {
    return sendMessage('session_control', { action: 'end' });
  }, [sendMessage]);

  return {
    isConnected,
    messages,
    sessionId,
    currentStep,
    sendTextMessage,
    sendVoiceMessage,
    sendCodeMessage,
    sendStepControl,
    startInterview,
    endInterview,
    connect: connectWebSocket,
    disconnect
  };
}; 