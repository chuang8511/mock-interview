// Shared types for frontend and backend communication

export interface Message {
  id: string;
  type: 'text_input' | 'voice_input' | 'code_input' | 'ai_response' | 'system' | 'error';
  content: string;
  timestamp: number;
  sender: 'user' | 'ai' | 'system';
  metadata?: {
    language?: string;
    isCode?: boolean;
    voiceEnabled?: boolean;
  };
}

export type MessageType = 
  | 'voice_input'
  | 'text_input' 
  | 'ai_response'
  | 'session_control'
  | 'error';

export interface SessionState {
  id: string;
  status: 'idle' | 'connected' | 'active' | 'completed';
  startTime: number;
  endTime?: number;
  currentProblem?: Problem;
  messages: Message[];
  userCode?: {
    [language: string]: string;
  };
}

export interface Problem {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  examples: Example[];
  constraints: string[];
  hints: string[];
  starterCode: {
    [language: string]: string;
  };
  testCases: TestCase[];
}

export interface Example {
  input: string;
  output: string;
  explanation?: string;
}

export interface TestCase {
  input: any;
  expectedOutput: any;
  hidden?: boolean;
}

export interface WebSocketMessage {
  type: 'text_input' | 'voice_input' | 'code_input' | 'session_control' | 'ai_response' | 'error';
  payload: any;
  sessionId?: string;
}

export interface VoiceInputPayload {
  transcript: string;
  confidence?: number;
  isFinal: boolean;
}

export interface TextInputPayload {
  text: string;
}

export interface AIResponsePayload {
  text: string;
  type: 'feedback' | 'question' | 'hint' | 'problem' | 'completion';
  streaming?: boolean;
}

export interface SessionControlPayload {
  action: 'start' | 'pause' | 'resume' | 'end';
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface InterviewContext {
  problemsSolved: number;
  currentPhase: 'introduction' | 'problem_presentation' | 'solution_discussion' | 'feedback' | 'completion';
  conversationHistory: Message[];
  userProgress: {
    understanding: number; // 0-100
    approach: number; // 0-100
    implementation: number; // 0-100
    optimization: number; // 0-100
  };
}

export interface VoiceConfig {
  inputEnabled: boolean;
  outputEnabled: boolean;
  language: string;
  rate: number;
  pitch: number;
  volume: number;
  voice?: string;
}

export interface CodeSubmission {
  language: string;
  code: string;
  problemId: string;
  timestamp: number;
}

export interface AIResponse {
  text: string;
  type: 'question' | 'feedback' | 'hint' | 'completion' | 'code_review';
  shouldSpeak?: boolean;
  metadata?: {
    problemId?: string;
    codeReview?: CodeReview;
  };
}

export interface CodeReview {
  overall: string;
  suggestions: string[];
  correctness: 'correct' | 'incorrect' | 'partial';
  efficiency: 'good' | 'fair' | 'poor';
  readability: 'good' | 'fair' | 'poor';
  followUpQuestions: string[];
}

export interface InterviewConfig {
  duration: number; // in minutes
  problemCount: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  languages: string[];
  voiceEnabled: boolean;
  codeReviewEnabled: boolean;
} 