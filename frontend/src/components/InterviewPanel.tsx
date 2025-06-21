import React, { useState, useEffect, useRef } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { useVoiceOutput } from '../hooks/useVoiceOutput';
import StatusBar from './StatusBar';
import MessageList from './MessageList';
import VoiceInput from './VoiceInput';
import VoiceOutput from './VoiceOutput';
import TextInput from './TextInput';
import CodeEditor from './CodeEditor';
import ProblemSetup from './ProblemSetup';
import InterviewSteps from './InterviewSteps';

const WEBSOCKET_URL = 'ws://localhost:3001';

interface ProblemConfig {
  type: 'url' | 'category';
  url?: string;
  category?: string;
  difficulty?: string;
}

const InterviewPanel: React.FC = () => {
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('text');
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [showProblemSetup, setShowProblemSetup] = useState(false);
  const [currentProblem, setCurrentProblem] = useState<any>(null);
  const [currentCode, setCurrentCode] = useState('');
  const [currentLanguage, setCurrentLanguage] = useState('python');
  const [showCodeEditor, setShowCodeEditor] = useState(true);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [showSteps, setShowSteps] = useState(true);
  
  // Voice settings state
  const [voiceSettings, setVoiceSettings] = useState({
    rate: 1.3,
    pitch: 1.0,
    volume: 0.8,
    autoPlay: true
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastSpokenMessageIdRef = useRef<string | null>(null);

  const {
    isConnected,
    messages,
    sessionId,
    currentStep,
    sendTextMessage,
    sendVoiceMessage,
    sendCodeMessage,
    sendStepControl,
    startInterview,
    endInterview
  } = useWebSocket(WEBSOCKET_URL);

  const {
    isListening,
    isSupported: isVoiceSupported,
    transcript,
    confidence,
    error: voiceError,
    stopListening,
    toggleListening
  } = useVoiceInput((transcript, isFinal) => {
    if (isFinal && transcript.trim()) {
      sendVoiceMessage(transcript);
    }
  }, {
    continuous: true,
    interimResults: true,
    language: 'en-US',
    maxAlternatives: 5,
    grammars: [
      // Enhanced technical interview vocabulary with common mispronunciations
      '#JSGF V1.0; grammar technical; public <technical> = ' +
      // Big O and complexity terms (commonly mispronounced)
      'big O | big oh | O of N | O of one | O of log N | O of N squared | O of N cubed | O of two to the N | ' +
      'time complexity | space complexity | constant time | linear time | logarithmic time | quadratic time | exponential time | ' +
      'O(1) | O(N) | O(log N) | O(N log N) | O(N²) | O(N^2) | O(2^N) | ' +
      // Data structures
      'array | linked list | doubly linked list | binary tree | binary search tree | AVL tree | red black tree | ' +
      'hash table | hash map | hash set | stack | queue | priority queue | heap | min heap | max heap | ' +
      'graph | directed graph | undirected graph | adjacency list | adjacency matrix | ' +
      // Algorithms
      'algorithm | recursion | iteration | dynamic programming | memoization | backtracking | ' +
      'binary search | linear search | depth first search | breadth first search | DFS | BFS | ' +
      'merge sort | quick sort | bubble sort | insertion sort | selection sort | heap sort | ' +
      'two pointers | sliding window | greedy algorithm | divide and conquer | ' +
      // Programming concepts
      'function | method | class | object | variable | constant | parameter | argument | ' +
      'loop | for loop | while loop | if statement | else statement | switch statement | ' +
      'try catch | exception handling | null pointer | edge case | base case | ' +
      // Languages and tech
      'JavaScript | Python | Java | TypeScript | C plus plus | C sharp | ' +
      'API | REST API | database | SQL | NoSQL | JSON | XML | ' +
      'frontend | backend | full stack | framework | library | ' +
      // Common interview phrases
      'brute force | optimal solution | trade off | edge case | corner case | ' +
      'test case | unit test | debugging | refactoring | scalability | performance | ' +
      'leetcode | coding interview | technical interview;'
    ]
  });

  const {
    isSupported: isTTSSupported,
    isSpeaking,
    isPaused,
    error: ttsError,
    speak,
    toggle: toggleTTS,
    queueLength
  } = useVoiceOutput(voiceSettings);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Automatically speak AI responses
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && 
        lastMessage.sender === 'ai' &&
        isTTSSupported && 
        voiceSettings.autoPlay &&
        lastMessage.id !== lastSpokenMessageIdRef.current) {
      
      // This is a new AI message that hasn't been spoken yet
      speak(lastMessage.content);
      lastSpokenMessageIdRef.current = lastMessage.id;
    }
  }, [messages, speak, isTTSSupported, voiceSettings.autoPlay]);

  // Listen for problem updates from server
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.type === 'session_control') {
      // Check if this message contains problem info
      // This would need to be extracted from the WebSocket message
    }
  }, [messages]);

  const handleStartInterview = () => {
    setShowProblemSetup(true);
  };

  const handleProblemSelected = (problemConfig: ProblemConfig) => {
    setShowProblemSetup(false);
    if (startInterview(problemConfig)) {
      setInterviewStarted(true);
    }
  };

  const handleCancelProblemSetup = () => {
    setShowProblemSetup(false);
  };

  const handleEndInterview = () => {
    if (endInterview()) {
      setInterviewStarted(false);
      setCurrentProblem(null);
    }
    if (isListening) {
      stopListening();
    }
  };

  const handleTextSubmit = (text: string) => {
    sendTextMessage(text);
  };

  const handleVoiceToggle = () => {
    if (!isVoiceSupported) {
      alert('Voice input is not supported in this browser. Please use Chrome or Edge.');
      return;
    }
    toggleListening();
  };

  const handleCodeSubmit = (code: string) => {
    setCurrentCode(code);
    sendCodeMessage(code, currentLanguage);
  };

  const handleCodeChange = (code: string) => {
    setCurrentCode(code);
  };

  const handleLanguageChange = (language: string) => {
    setCurrentLanguage(language);
  };

  const handleVoiceSettingChange = (setting: keyof typeof voiceSettings, value: number | boolean) => {
    setVoiceSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  const resetVoiceSettings = () => {
    setVoiceSettings({
      rate: 1.0,
      pitch: 1.0,
      volume: 0.8,
      autoPlay: true
    });
  };

  const handleSpeakLatest = () => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.sender === 'ai') {
      speak(lastMessage.content);
      lastSpokenMessageIdRef.current = lastMessage.id;
    }
  };

  const handleTestSpeak = () => {
    speak('This is a test of the text to speech system. Can you hear this?', true);
  };

  const handleStepChange = (stepOrAction: string) => {
    if (stepOrAction === 'next' || stepOrAction === 'previous') {
      sendStepControl(stepOrAction);
    } else {
      sendStepControl('set_step', stepOrAction);
    }
  };

  return (
    <div className="interview-panel">
      <StatusBar 
        isConnected={isConnected}
        sessionId={sessionId}
        interviewStarted={interviewStarted}
        onStartInterview={handleStartInterview}
        onEndInterview={handleEndInterview}
      />

      {showProblemSetup && (
        <ProblemSetup
          onProblemSelected={handleProblemSelected}
          onCancel={handleCancelProblemSetup}
        />
      )}

      <div className="interview-content">
        {/* Interview Steps Panel */}
        {interviewStarted && showSteps && (
          <div className="steps-section">
            <InterviewSteps
              currentStep={currentStep}
              onStepChange={handleStepChange}
              disabled={!isConnected}
            />
            <button
              className="toggle-steps-button"
              onClick={() => setShowSteps(false)}
              title="Hide interview steps"
            >
              ➖ Hide Steps
            </button>
          </div>
        )}

        {/* Show Steps Button */}
        {interviewStarted && !showSteps && (
          <div className="show-steps-section">
            <button
              className="show-steps-button"
              onClick={() => setShowSteps(true)}
            >
              📋 Show Interview Steps
            </button>
          </div>
        )}

        {/* Chat Section */}
        <div className="chat-section">
          <div className="messages-container">
            <MessageList messages={messages} />
            <div ref={messagesEndRef} />
          </div>

          {/* Voice Output Controls */}
          {isTTSSupported && (
            <div className="voice-output-section">
              <VoiceOutput
                isSpeaking={isSpeaking}
                isPaused={isPaused}
                isSupported={isTTSSupported}
                error={ttsError}
                queueLength={queueLength}
                autoPlay={voiceSettings.autoPlay}
                onToggle={toggleTTS}
                onSpeakLatest={handleSpeakLatest}
                disabled={!isConnected}
              />
              
              {/* Voice Settings Panel */}
              <div className="voice-settings-container">
                <button
                  className="voice-settings-toggle"
                  onClick={() => setShowVoiceSettings(!showVoiceSettings)}
                >
                  ⚙️ Voice Settings {showVoiceSettings ? '▲' : '▼'}
                </button>
                
                {showVoiceSettings && (
                  <div className="voice-settings-panel">
                    <div className="voice-setting">
                      <label>
                        Speed: {voiceSettings.rate.toFixed(1)}x
                        <input
                          type="range"
                          min="0.5"
                          max="2.5"
                          step="0.1"
                          value={voiceSettings.rate}
                          onChange={(e) => handleVoiceSettingChange('rate', parseFloat(e.target.value))}
                          className="voice-slider"
                        />
                      </label>
                      <div className="setting-presets">
                        <button onClick={() => handleVoiceSettingChange('rate', 0.8)}>Slow</button>
                        <button onClick={() => handleVoiceSettingChange('rate', 1.0)}>Normal</button>
                        <button onClick={() => handleVoiceSettingChange('rate', 1.3)}>Fast</button>
                        <button onClick={() => handleVoiceSettingChange('rate', 1.7)}>Very Fast</button>
                      </div>
                    </div>
                    
                    <div className="voice-setting">
                      <label>
                        Pitch: {voiceSettings.pitch.toFixed(1)}
                        <input
                          type="range"
                          min="0.5"
                          max="2.0"
                          step="0.1"
                          value={voiceSettings.pitch}
                          onChange={(e) => handleVoiceSettingChange('pitch', parseFloat(e.target.value))}
                          className="voice-slider"
                        />
                      </label>
                    </div>
                    
                    <div className="voice-setting">
                      <label>
                        Volume: {Math.round(voiceSettings.volume * 100)}%
                        <input
                          type="range"
                          min="0.1"
                          max="1.0"
                          step="0.1"
                          value={voiceSettings.volume}
                          onChange={(e) => handleVoiceSettingChange('volume', parseFloat(e.target.value))}
                          className="voice-slider"
                        />
                      </label>
                    </div>
                    
                    <div className="voice-setting">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={voiceSettings.autoPlay}
                          onChange={(e) => handleVoiceSettingChange('autoPlay', e.target.checked)}
                        />
                        Auto-play AI responses
                      </label>
                    </div>
                    
                    <div className="voice-setting-actions">
                      <button onClick={resetVoiceSettings} className="reset-button">
                        Reset to Defaults
                      </button>
                      <button onClick={handleTestSpeak} className="test-button">
                        🔊 Test Speech
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Input Section */}
          <div className="input-section">
            <div className="input-tabs">
              <button 
                className={`input-tab ${inputMode === 'text' ? 'active' : ''}`}
                onClick={() => setInputMode('text')}
              >
                💬 Text
              </button>
              <button 
                className={`input-tab ${inputMode === 'voice' ? 'active' : ''}`}
                onClick={() => setInputMode('voice')}
                disabled={!isVoiceSupported}
              >
                🎤 Voice {!isVoiceSupported && '(Not Supported)'}
              </button>
            </div>

            {inputMode === 'voice' ? (
              <VoiceInput
                isListening={isListening}
                transcript={transcript}
                error={voiceError}
                isSupported={isVoiceSupported}
                onToggleListening={handleVoiceToggle}
                disabled={!isConnected}
              />
            ) : (
              <TextInput
                onSubmit={handleTextSubmit}
                disabled={!isConnected}
              />
            )}
          </div>
        </div>

        {/* Code Editor Section */}
        {showCodeEditor && (
          <div className="code-section">
            <div className="code-section-header">
              <h3>💻 Code Editor</h3>
              
              <div className="code-controls">
                <select
                  value={currentLanguage}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="language-selector"
                >
                  <option value="python">Python</option>
                  <option value="javascript">JavaScript</option>
                  <option value="java">Java</option>
                  <option value="cpp">C++</option>
                  <option value="typescript">TypeScript</option>
                </select>
                
                <button
                  className="toggle-editor-button"
                  onClick={() => setShowCodeEditor(false)}
                  title="Hide code editor"
                >
                  ➖
                </button>
              </div>
            </div>

            <CodeEditor
              language={currentLanguage}
              value={currentCode}
              onChange={handleCodeChange}
              onSubmit={handleCodeSubmit}
              height="500px"
              placeholder={getCodeTemplate(currentLanguage)}
            />
          </div>
        )}

        {/* Show Code Editor Button */}
        {!showCodeEditor && (
          <div className="show-editor-section">
            <button
              className="show-editor-button"
              onClick={() => setShowCodeEditor(true)}
            >
              💻 Show Code Editor
            </button>
          </div>
        )}
      </div>

      {!isConnected && (
        <div className="connection-warning">
          <p>⚠️ Not connected to server. Trying to reconnect...</p>
        </div>
      )}
    </div>
  );
};

// Helper function to get code templates
const getCodeTemplate = (language: string): string => {
  const templates = {
    python: `# Write your solution here
def solution():
    # Your code here
    return None

# Test your solution
print(solution())`,
    
    javascript: `// Write your solution here
function solution() {
    // Your code here
    return null;
}

// Test your solution
console.log(solution());`,
    
    java: `// Write your solution here
public class Solution {
    public Object solution() {
        // Your code here
        return null;
    }
    
    public static void main(String[] args) {
        Solution sol = new Solution();
        System.out.println(sol.solution());
    }
}`,
    
    cpp: `// Write your solution here
#include <iostream>
using namespace std;

class Solution {
public:
    void solution() {
        // Your code here
    }
};

int main() {
    Solution sol;
    sol.solution();
    return 0;
}`,
    
    typescript: `// Write your solution here
function solution(): any {
    // Your code here
    return null;
}

// Test your solution
console.log(solution());`
  };
  
  return templates[language as keyof typeof templates] || templates.python;
};

export default InterviewPanel; 