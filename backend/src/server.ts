import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import dotenv from 'dotenv';
import { MistralService, INTERVIEW_PROMPTS, CODING_PROBLEMS, getRandomProblem, parseLeetCodeUrl, INTERVIEW_STEPS, InterviewStep, getNextStep, getPreviousStep, detectStepFromUserInput } from './services/mistral';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Middleware
app.use(cors());
app.use(express.json());

// Environment configuration
const PORT = process.env.PORT || 3001;
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const MODEL_NAME = process.env.MISTRAL_MODEL || 'mistral-large-latest';

if (!MISTRAL_API_KEY) {
  console.error('❌ MISTRAL_API_KEY environment variable is required');
  process.exit(1);
}

// Initialize Mistral service
let mistralService: MistralService;
try {
  mistralService = new MistralService({
    apiKey: MISTRAL_API_KEY,
    model: MODEL_NAME
  });
  console.log('✅ Mistral service: configured');
} catch (error) {
  console.error('❌ Failed to initialize Mistral service:', error);
  process.exit(1);
}

// Session management
interface Session {
  id: string;
  ws: any;
  messages: Array<{ role: string; content: string; timestamp: number }>;
  status: 'idle' | 'active' | 'completed';
  currentProblem?: any;
  userCode?: { [language: string]: string };
  startTime: number;
  currentStep: InterviewStep;
}

const sessions = new Map<string, Session>();

// WebSocket connection handling
wss.on('connection', (ws) => {
  const sessionId = uuidv4();
  console.log(`🔌 New WebSocket connection: ${sessionId}`);

  // Create new session
  const session: Session = {
    id: sessionId,
    ws,
    messages: [],
    status: 'idle',
    userCode: {},
    startTime: Date.now(),
    currentStep: INTERVIEW_STEPS.STEP_1_PROBLEM_EXPLANATION
  };
  sessions.set(sessionId, session);

  // Send session info to client
  ws.send(JSON.stringify({
    type: 'session_control',
    payload: {
      sessionId,
      message: 'Connected to interview server'
    }
  }));

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log(`📨 Message from ${sessionId}:`, message.type);

      await handleWebSocketMessage(session, message);
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        payload: { message: 'Failed to process message' }
      }));
    }
  });

  ws.on('close', () => {
    console.log(`🔌 WebSocket disconnected: ${sessionId}`);
    sessions.delete(sessionId);
  });

  ws.on('error', (error) => {
    console.error(`WebSocket error for ${sessionId}:`, error);
  });
});

async function handleWebSocketMessage(session: Session, message: any) {
  const { type, payload } = message;

  switch (type) {
    case 'session_control':
      await handleSessionControl(session, payload);
      break;
    
    case 'text_input':
      await handleTextInput(session, payload);
      break;
    
    case 'voice_input':
      await handleVoiceInput(session, payload);
      break;
    
    case 'code_input':
      await handleCodeInput(session, payload);
      break;
    
    case 'step_control':
      await handleStepControl(session, payload);
      break;
    
    default:
      console.log(`Unknown message type: ${type}`);
  }
}

async function handleSessionControl(session: Session, payload: any) {
  const { action, problemConfig } = payload;

  console.log(`🔍 Debug - Session control received:`, {
    action,
    problemConfig: problemConfig || 'NO CONFIG PROVIDED'
  });

  if (action === 'start') {
    session.status = 'active';
    session.startTime = Date.now();
    
    let problem = null;
    
    if (problemConfig) {
      if (problemConfig.type === 'category') {
        // Get random problem from category
        problem = getRandomProblem(problemConfig.category, problemConfig.difficulty);
        if (!problem) {
          session.ws.send(JSON.stringify({
            type: 'error',
            payload: { message: `No ${problemConfig.difficulty || ''} problems found in ${problemConfig.category} category` }
          }));
          return;
        }
      } else if (problemConfig.type === 'url') {
        // Parse LeetCode URL (for now, we'll show a placeholder)
        const parsed = parseLeetCodeUrl(problemConfig.url);
        if (parsed) {
          problem = {
            id: parsed.problemSlug,
            title: parsed.problemSlug.split('-').map(word => 
              word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' '),
            difficulty: 'Unknown',
            category: 'custom',
            description: `This is a custom problem. Please describe the problem requirements and I'll help you solve it.`,
            examples: [],
            constraints: []
          };
        } else {
          session.ws.send(JSON.stringify({
            type: 'error',
            payload: { message: 'Invalid LeetCode URL format' }
          }));
          return;
        }
      }
      
      // If problem is provided, start at step 2 (clarification)
      session.currentStep = INTERVIEW_STEPS.STEP_2_CLARIFICATION;
    } else {
      // Default: random easy array problem, start at step 1
      problem = getRandomProblem('array', 'Easy');
      session.currentStep = INTERVIEW_STEPS.STEP_1_PROBLEM_EXPLANATION;
    }
    
    if (!problem) {
      session.ws.send(JSON.stringify({
        type: 'error',
        payload: { message: 'Failed to select a problem' }
      }));
      return;
    }
    
    session.currentProblem = problem;
    
    console.log(`🔍 Debug - Problem set in session:`, {
      id: problem.id,
      title: problem.title,
      category: problem.category,
      difficulty: problem.difficulty,
      description: problem.description.substring(0, 100) + '...'
    });
    
    const greeting = "Hi! Ready to solve a coding problem? Let's get started.";
    
    const problemPresentation = INTERVIEW_PROMPTS.PROBLEM_PRESENTATION
      .replace('{title}', problem.title)
      .replace('{difficulty}', problem.difficulty)
      .replace('{description}', problem.description)
      .replace('{examples}', problem.examples.length > 0 ? 
        `\n**Example**: ${problem.examples.map(ex => 
          `Input: ${ex.input}\nOutput: ${ex.output}${(ex as any).explanation ? '\nExplanation: ' + (ex as any).explanation : ''}`
        ).join('\n\n')}\n` : ''
      )
      .replace('{constraints}', problem.constraints.length > 0 ? 
        `\n**Constraints**: ${problem.constraints.join('\n')}\n` : ''
      );

    const fullMessage = greeting + '\n\n' + problemPresentation;

    // Add to conversation history
    session.messages.push({
      role: 'assistant',
      content: fullMessage,
      timestamp: Date.now()
    });

    // Send AI response
    session.ws.send(JSON.stringify({
      type: 'ai_response',
      payload: {
        text: fullMessage,
        shouldSpeak: true,
        currentStep: session.currentStep
      }
    }));

    session.ws.send(JSON.stringify({
      type: 'session_control',
      payload: { message: 'Interview started', problem, currentStep: session.currentStep }
    }));

  } else if (action === 'end') {
    session.status = 'completed';
    
    const completion = INTERVIEW_PROMPTS.COMPLETION;
    
    session.messages.push({
      role: 'assistant',
      content: completion,
      timestamp: Date.now()
    });

    session.ws.send(JSON.stringify({
      type: 'ai_response',
      payload: {
        text: completion,
        shouldSpeak: true
      }
    }));

    session.ws.send(JSON.stringify({
      type: 'session_control',
      payload: { message: 'Interview completed' }
    }));
  }
}

async function handleTextInput(session: Session, payload: any) {
  const { text } = payload;
  
  // Add user message to history
  session.messages.push({
    role: 'user',
    content: text,
    timestamp: Date.now()
  });

  await generateAIResponse(session, text);
}

async function handleVoiceInput(session: Session, payload: any) {
  const { transcript, isFinal } = payload;
  
  if (isFinal) {
    // Add user message to history
    session.messages.push({
      role: 'user',
      content: transcript,
      timestamp: Date.now()
    });

    await generateAIResponse(session, transcript);
  }
}

async function handleCodeInput(session: Session, payload: any) {
  const { code, language } = payload;
  
  console.log(`📨 Code submission from ${session.id}: ${language} code (${code.length} chars)`);
  
  // Store the code
  if (!session.userCode) {
    session.userCode = {};
  }
  session.userCode[language] = code;

  // Add code submission to history
  const codeMessage = `Here's my ${language} solution:\n\`\`\`${language}\n${code}\n\`\`\``;
  session.messages.push({
    role: 'user',
    content: codeMessage,
    timestamp: Date.now()
  });

  // Automatically transition to Step 5 (Code Review) when code is submitted
  if (session.status === 'active' && session.currentStep !== INTERVIEW_STEPS.STEP_5_CODE_REVIEW) {
    console.log(`Auto-transitioning to code review step after code submission`);
    session.currentStep = INTERVIEW_STEPS.STEP_5_CODE_REVIEW;
    
    // Notify client of step change
    session.ws.send(JSON.stringify({
      type: 'step_control',
      payload: { 
        message: `Automatically moved to step: ${session.currentStep}`, 
        currentStep: session.currentStep,
        autoDetected: true
      }
    }));
  }

  // Generate step-based code review using Step 5 prompt
  try {
    const conversationHistory = session.messages.slice(0, -1); // Exclude the current message
    let response;

    if (session.currentProblem && session.status === 'active') {
      // Use step-based response for code review
      const problemContext = `Problem: ${session.currentProblem.title} - ${session.currentProblem.description}`;
      
      console.log(`🔍 Debug - Current problem in session:`, {
        id: session.currentProblem.id,
        title: session.currentProblem.title,
        description: session.currentProblem.description.substring(0, 100) + '...'
      });
      console.log(`🔍 Debug - Problem context being sent to AI:`, problemContext);
      
      const stepResponse = await mistralService.handleStepBasedResponse(
        INTERVIEW_STEPS.STEP_5_CODE_REVIEW,
        codeMessage,
        problemContext,
        conversationHistory
      );
      
      response = stepResponse.response;
    } else {
      // Fallback to general code review when no specific problem is set
      const generalPrompt = `You are an experienced software engineering interviewer. Please review this ${language} code and provide constructive feedback.

Analyze the code for:
1. **Code Quality**: Is it readable, well-structured, and following best practices?
2. **Functionality**: What does this code do? Are there any obvious issues?
3. **Efficiency**: Can you suggest any optimizations?
4. **Style**: Does it follow good ${language} conventions?
5. **Suggestions**: What improvements would you recommend?

Be encouraging and educational in your feedback.`;

      response = await mistralService.generateResponse(
        generalPrompt,
        `Please review this ${language} code:\n\`\`\`${language}\n${code}\n\`\`\``,
        conversationHistory
      );
    }

    session.messages.push({
      role: 'assistant',
      content: response,
      timestamp: Date.now()
    });

    session.ws.send(JSON.stringify({
      type: 'ai_response',
      payload: {
        text: response,
        shouldSpeak: true,
        currentStep: session.currentStep,
        type: 'code_review'
      }
    }));

    console.log(`✅ Code review generated for ${session.id} using step-based system`);

  } catch (error) {
    console.error('Error generating code review:', error);
    session.ws.send(JSON.stringify({
      type: 'error',
      payload: { message: 'Failed to review code' }
    }));
  }
}

async function handleStepControl(session: Session, payload: any) {
  const { action, step } = payload;

  if (action === 'set_step' && step) {
    session.currentStep = step;
    session.ws.send(JSON.stringify({
      type: 'step_control',
      payload: { message: 'Step changed', currentStep: session.currentStep }
    }));
  } else if (action === 'next') {
    session.currentStep = getNextStep(session.currentStep);
    session.ws.send(JSON.stringify({
      type: 'step_control', 
      payload: { message: 'Step changed', currentStep: session.currentStep }
    }));
  } else if (action === 'previous') {
    session.currentStep = getPreviousStep(session.currentStep);
    session.ws.send(JSON.stringify({
      type: 'step_control', 
      payload: { message: 'Step changed', currentStep: session.currentStep }
    }));
  }
}

async function generateAIResponse(session: Session, userInput: string) {
  try {
    const conversationHistory = session.messages.slice(0, -1); // Exclude the current user message
    
    let response: string;
    let stepChanged = false;
    let validationMessage = '';
    
    // Detect step transition from user input
    if (session.status === 'active') {
      const stepDetection = detectStepFromUserInput(userInput, session.currentStep);
      
      if (stepDetection.shouldTransition && stepDetection.suggestedStep !== session.currentStep) {
        console.log(`Step transition detected: ${session.currentStep} -> ${stepDetection.suggestedStep}`);
        session.currentStep = stepDetection.suggestedStep;
        stepChanged = true;
        
        // If there's a reason (validation message), this means the user tried to skip a step
        if (stepDetection.reason) {
          // Notify client of step change with validation message
          session.ws.send(JSON.stringify({
            type: 'step_control',
            payload: { 
              message: `Moved to step: ${stepDetection.suggestedStep} - ${stepDetection.reason}`, 
              currentStep: session.currentStep,
              autoDetected: true,
              validationMessage: stepDetection.reason
            }
          }));
        } else {
          // Normal step transition
          session.ws.send(JSON.stringify({
            type: 'step_control',
            payload: { 
              message: `Automatically moved to step: ${stepDetection.suggestedStep}`, 
              currentStep: session.currentStep,
              autoDetected: true
            }
          }));
        }
      } else if (!stepDetection.shouldTransition && stepDetection.reason) {
        // Validation failed - include the reason in the response
        validationMessage = stepDetection.reason + ' ';
      }
    }
    
    if (session.currentProblem && session.status === 'active') {
      // During active interview, use step-based approach
      const problemContext = `Problem: ${session.currentProblem.title} - ${session.currentProblem.description}`;
      
      // If there's a validation message, prepend it to the AI response
      if (validationMessage) {
        const validationPrompt = `You are a technical interviewer. The candidate just asked something inappropriate for the current step. 

Respond with: "${validationMessage}" and then guide them appropriately for the current step.

Current step context: ${problemContext}`;
        
        response = await mistralService.generateResponse(
          validationPrompt,
          userInput,
          conversationHistory
        );
      } else {
        const stepResponse = await mistralService.handleStepBasedResponse(
          session.currentStep,
          userInput,
          problemContext,
          conversationHistory
        );
        
        response = stepResponse.response;
        
        // Auto-advance step if indicated (e.g., detailed solution explanation in step 3)
        if (stepResponse.shouldAdvanceStep) {
          const nextStep = getNextStep(session.currentStep);
          if (nextStep !== session.currentStep) {
            console.log(`Auto-advancing step: ${session.currentStep} -> ${nextStep}`);
            session.currentStep = nextStep;
            stepChanged = true;
            
            // Notify client of automatic step advancement
            session.ws.send(JSON.stringify({
              type: 'step_control',
              payload: { 
                message: `Advanced to ${nextStep}`, 
                currentStep: session.currentStep,
                autoAdvanced: true
              }
            }));
          }
        }
      }
    } else {
      // Fallback to general response
      response = await mistralService.generateResponse(
        INTERVIEW_PROMPTS.SYSTEM_PROMPT,
        userInput,
        conversationHistory
      );
    }

    // Add AI response to history
    session.messages.push({
      role: 'assistant',
      content: response,
      timestamp: Date.now()
    });

    // Send response to client with current step info
    session.ws.send(JSON.stringify({
      type: 'ai_response',
      payload: {
        text: response,
        shouldSpeak: true,
        currentStep: session.currentStep,
        stepChanged: stepChanged
      }
    }));

  } catch (error) {
    console.error('Error generating AI response:', error);
    session.ws.send(JSON.stringify({
      type: 'error',
      payload: { message: 'Failed to generate AI response' }
    }));
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    sessions: sessions.size,
    mistral: 'configured'
  });
});

// Test endpoint for Mistral
app.post('/test-mistral', async (req, res) => {
  try {
    const { message = 'Hello, can you help me with coding interviews?' } = req.body;
    
    const response = await mistralService.generateResponse(
      INTERVIEW_PROMPTS.SYSTEM_PROMPT,
      message
    );
    
    res.json({
      success: true,
      response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready`);
  console.log(`🤖 Mistral AI: ${MODEL_NAME}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
}); 