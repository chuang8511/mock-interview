import Mistral from '@mistralai/mistralai';

export interface MistralConfig {
  apiKey: string;
  model: string;
}

export class MistralService {
  private client: Mistral;
  private model: string;

  constructor(config: MistralConfig) {
    this.client = new Mistral(config.apiKey);
    this.model = config.model;
  }

  async generateResponse(
    systemPrompt: string,
    userMessage: string,
    conversationHistory: Array<{ role: string; content: string; timestamp?: number }> = []
  ): Promise<string> {
    try {
      // Format messages for Mistral API - only include role and content
      const formattedHistory = conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const messages = [
        { role: 'system', content: systemPrompt },
        ...formattedHistory,
        { role: 'user', content: userMessage }
      ];

      console.log('Sending to Mistral API:', JSON.stringify(messages, null, 2));

      const response = await this.client.chat({
        model: this.model,
        messages: messages,
        temperature: 0.7,
        maxTokens: 1000,
      });

      return response.choices[0]?.message?.content || 'I apologize, but I could not generate a response.';
    } catch (error) {
      console.error('Mistral API error:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  async generateStreamingResponse(
    systemPrompt: string,
    userMessage: string,
    conversationHistory: Array<{ role: string; content: string; timestamp?: number }> = [],
    onChunk: (chunk: string) => void
  ): Promise<void> {
    try {
      // Format messages for Mistral API - only include role and content
      const formattedHistory = conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const messages = [
        { role: 'system', content: systemPrompt },
        ...formattedHistory,
        { role: 'user', content: userMessage }
      ];

      const response = await this.client.chatStream({
        model: this.model,
        messages: messages,
        temperature: 0.7,
        maxTokens: 1000,
      });

      for await (const chunk of response) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          onChunk(content);
        }
      }
    } catch (error) {
      console.error('Mistral streaming error:', error);
      throw new Error('Failed to generate streaming response');
    }
  }

  async reviewCode(
    code: string,
    language: string,
    problemDescription: string,
    conversationHistory: Array<{ role: string; content: string; timestamp?: number }> = []
  ): Promise<string> {
    const codeReviewPrompt = INTERVIEW_PROMPTS.CODE_REVIEW_PROMPT
      .replace('{language}', language)
      .replace('{problemDescription}', problemDescription);

    const userMessage = `Please review this ${language} code:\n\`\`\`${language}\n${code}\n\`\`\``;

    return this.generateResponse(codeReviewPrompt, userMessage, conversationHistory);
  }

  async handleCandidateApproach(
    candidateStatement: string,
    problemContext: string,
    conversationHistory: Array<{ role: string; content: string; timestamp?: number }> = []
  ): Promise<string> {
    const approachPrompt = `You are a technical interviewer. The candidate just explained their approach.

CRITICAL: Be extremely minimal. DO NOT:
- Summarize what they said
- Break down their approach
- List steps back to them
- Ask multiple questions
- Give any hints or guidance

ONLY respond with:
- "Got it, go ahead and code it" 
- "Sounds good, let's see the code"
- "Alright, code it up"
- "OK, please write the code"

Pick one short response under 8 words.`;

    return this.generateResponse(approachPrompt, candidateStatement, conversationHistory);
  }

  async handleStepBasedResponse(
    step: InterviewStep,
    userInput: string,
    problemContext: string,
    conversationHistory: Array<{ role: string; content: string; timestamp?: number }> = []
  ): Promise<{ response: string; shouldAdvanceStep?: boolean }> {
    const stepPrompt = getStepPrompt(step);
    
    // For step 3, analyze if the explanation is detailed enough
    if (step === INTERVIEW_STEPS.STEP_3_SOLUTION_DISCUSSION) {
      const isDetailed = this.isSolutionExplanationDetailed(userInput);
      
      if (isDetailed) {
        // Give a brief acknowledgment and signal to advance to coding step
        const briefResponses = [
          "Sounds good, go ahead and code it",
          "Got it, let's see the implementation", 
          "Alright, code it up",
          "Perfect, please implement that",
          "Great approach, start coding"
        ];
        const response = briefResponses[Math.floor(Math.random() * briefResponses.length)];
        return { response, shouldAdvanceStep: true };
      }
    }
    
    const contextualPrompt = `${stepPrompt}

Problem context: ${problemContext}

Candidate said: "${userInput}"

Respond according to the step guidelines above.`;

    const response = await this.generateResponse(contextualPrompt, userInput, conversationHistory);
    return { response };
  }

  private isSolutionExplanationDetailed(explanation: string): boolean {
    const input = explanation.toLowerCase();
    
    // Check for detailed explanation indicators
    const detailIndicators = [
      // Mentions specific steps or process
      /start.*from|begin.*with|first.*then|step.*by.*step/i,
      // Describes movement or iteration
      /move.*pointer|iterate|loop.*through|traverse/i,
      // Mentions comparisons or conditions
      /compare|check.*if|when.*equal|if.*match/i,
      // Describes data structures usage
      /store.*in|put.*into|use.*array|hash.*table/i,
      // Mentions handling of cases
      /handle.*case|convert.*to|ignore.*non/i,
      // Describes algorithm mechanics
      /left.*right|beginning.*end|increment|decrement/i
    ];
    
    // Count how many detail indicators are present
    const detailCount = detailIndicators.filter(pattern => pattern.test(input)).length;
    
    // Also check for length - detailed explanations are usually longer
    const wordCount = input.split(/\s+/).length;
    
    // Consider it detailed if:
    // - Has multiple detail indicators (2+) AND reasonable length (15+ words)
    // - OR has very high word count (30+ words) with at least 1 indicator
    return (detailCount >= 2 && wordCount >= 15) || (detailCount >= 1 && wordCount >= 30);
  }
}

export const INTERVIEW_STEPS = {
  STEP_1_PROBLEM_EXPLANATION: 'problem_explanation',
  STEP_2_CLARIFICATION: 'clarification', 
  STEP_3_SOLUTION_DISCUSSION: 'solution_discussion',
  STEP_4_CODING: 'coding',
  STEP_5_CODE_REVIEW: 'code_review',
  STEP_6_FOLLOW_UP: 'follow_up',
  STEP_7_COMPLEXITY: 'complexity'
} as const;

export type InterviewStep = typeof INTERVIEW_STEPS[keyof typeof INTERVIEW_STEPS];

export const detectStepFromUserInput = (userInput: string, currentStep: InterviewStep): { suggestedStep: InterviewStep; shouldTransition: boolean; reason?: string } => {
  const input = userInput.toLowerCase().trim();
  
  // Step 2: Clarification questions
  const clarificationPatterns = [
    /what.*if/i, /can.*assume/i, /should.*handle/i, /what.*about/i,
    /clarify/i, /understand.*problem/i, /edge.*case/i,
    /constraint/i, /input.*range/i, /output.*format/i, /example/i
  ];
  
  // Remove the general "question" pattern to avoid conflicts
  const specificQuestionPatterns = [
    /what.*if/i, /can.*assume/i, /should.*handle/i, /what.*about/i,
    /clarify/i, /edge.*case/i, /constraint/i, /input.*range/i, 
    /output.*format/i, /example/i
  ];
  
  // Step 3: Solution discussion
  const solutionPatterns = [
    /approach/i, /solution/i, /algorithm/i, /strategy/i, /plan/i,
    /think.*about/i, /would.*use/i, /idea.*is/i, /solve.*by/i,
    /my.*approach/i, /i.*think/i, /propose/i, /suggest/i,
    /iterate/i, /loop/i, /recursion/i, /dynamic.*programming/i,
    /hash.*table/i, /binary.*search/i, /two.*pointer/i, /sliding.*window/i,
    /breadth.*first/i, /depth.*first/i, /sort/i
  ];
  
  // Step 4: Coding requests
  const codingPatterns = [
    /start.*cod/i, /write.*code/i, /implement/i, /code.*now/i,
    /begin.*coding/i, /let.*code/i, /ready.*to.*code/i,
    /can.*i.*code/i, /should.*i.*code/i, /time.*to.*code/i
  ];
  
  // Step 5: Code review
  const reviewPatterns = [
    /review.*code/i, /check.*code/i, /look.*at.*code/i,
    /finished.*coding/i, /done.*with.*code/i, /completed.*solution/i,
    /here.*is.*my.*code/i, /my.*solution/i
  ];
  
  // Step 6: Follow-up
  const followUpPatterns = [
    /optimiz/i, /improve/i, /better.*way/i, /alternative/i,
    /different.*approach/i, /more.*efficient/i, /trade.*off/i,
    /pros.*and.*cons/i, /other.*solution/i
  ];
  
  // Step 7: Complexity
  const complexityPatterns = [
    /time.*complexity/i, /space.*complexity/i, /big.*o/i,
    /runtime/i, /memory.*usage/i, /complexity.*analysis/i,
    /o\(.*\)/i, /linear.*time/i, /constant.*time/i, /logarithmic/i
  ];

  // Check for natural progression first (higher priority)
  if (/understand.*problem/i.test(input) && currentStep === INTERVIEW_STEPS.STEP_1_PROBLEM_EXPLANATION) {
    return { suggestedStep: INTERVIEW_STEPS.STEP_2_CLARIFICATION, shouldTransition: true };
  }
  
  if (/(no.*more.*question|no.*question|ready.*to.*discuss|ready.*for.*next)/i.test(input) && currentStep === INTERVIEW_STEPS.STEP_2_CLARIFICATION) {
    return { suggestedStep: INTERVIEW_STEPS.STEP_3_SOLUTION_DISCUSSION, shouldTransition: true };
  }
  
  if (/(got.*it|sounds.*good|go.*ahead|code.*it)/i.test(input) && currentStep === INTERVIEW_STEPS.STEP_3_SOLUTION_DISCUSSION) {
    return { suggestedStep: INTERVIEW_STEPS.STEP_4_CODING, shouldTransition: true };
  }

  // CRITICAL: Check for coding requests and enforce solution discussion requirement
  if (codingPatterns.some(pattern => pattern.test(input))) {
    // Block coding if user hasn't discussed solution yet
    if (currentStep === INTERVIEW_STEPS.STEP_1_PROBLEM_EXPLANATION ||
        currentStep === INTERVIEW_STEPS.STEP_2_CLARIFICATION) {
      return { 
        suggestedStep: INTERVIEW_STEPS.STEP_3_SOLUTION_DISCUSSION, 
        shouldTransition: true, 
        reason: "Before coding, please first explain your approach and solution strategy."
      };
    }
    // Allow coding only after solution discussion
    if (currentStep === INTERVIEW_STEPS.STEP_3_SOLUTION_DISCUSSION ||
        currentStep === INTERVIEW_STEPS.STEP_4_CODING) {
      return { suggestedStep: INTERVIEW_STEPS.STEP_4_CODING, shouldTransition: true };
    }
  }

  // Check for step transitions based on patterns
  if (clarificationPatterns.some(pattern => pattern.test(input))) {
    if (currentStep === INTERVIEW_STEPS.STEP_1_PROBLEM_EXPLANATION || 
        currentStep === INTERVIEW_STEPS.STEP_2_CLARIFICATION) {
      return { suggestedStep: INTERVIEW_STEPS.STEP_2_CLARIFICATION, shouldTransition: true };
    }
  }
  
  if (solutionPatterns.some(pattern => pattern.test(input))) {
    if (currentStep === INTERVIEW_STEPS.STEP_2_CLARIFICATION ||
        currentStep === INTERVIEW_STEPS.STEP_3_SOLUTION_DISCUSSION) {
      return { suggestedStep: INTERVIEW_STEPS.STEP_3_SOLUTION_DISCUSSION, shouldTransition: true };
    }
  }
  
  if (reviewPatterns.some(pattern => pattern.test(input))) {
    if (currentStep === INTERVIEW_STEPS.STEP_4_CODING ||
        currentStep === INTERVIEW_STEPS.STEP_5_CODE_REVIEW) {
      return { suggestedStep: INTERVIEW_STEPS.STEP_5_CODE_REVIEW, shouldTransition: true };
    }
  }
  
  if (followUpPatterns.some(pattern => pattern.test(input))) {
    if (currentStep === INTERVIEW_STEPS.STEP_5_CODE_REVIEW ||
        currentStep === INTERVIEW_STEPS.STEP_6_FOLLOW_UP) {
      return { suggestedStep: INTERVIEW_STEPS.STEP_6_FOLLOW_UP, shouldTransition: true };
    }
  }
  
  if (complexityPatterns.some(pattern => pattern.test(input))) {
    if (currentStep === INTERVIEW_STEPS.STEP_5_CODE_REVIEW ||
        currentStep === INTERVIEW_STEPS.STEP_6_FOLLOW_UP ||
        currentStep === INTERVIEW_STEPS.STEP_7_COMPLEXITY) {
      return { suggestedStep: INTERVIEW_STEPS.STEP_7_COMPLEXITY, shouldTransition: true };
    }
  }

  // No step change needed
  return { suggestedStep: currentStep, shouldTransition: false };
};

export const getPreviousStep = (currentStep: InterviewStep): InterviewStep => {
  const steps = Object.values(INTERVIEW_STEPS);
  const currentIndex = steps.indexOf(currentStep);
  return steps[currentIndex - 1] || currentStep;
};

export const getNextStep = (currentStep: InterviewStep): InterviewStep => {
  const steps = Object.values(INTERVIEW_STEPS);
  const currentIndex = steps.indexOf(currentStep);
  return steps[currentIndex + 1] || currentStep;
};

export const STEP_PROMPTS = {
  [INTERVIEW_STEPS.STEP_1_PROBLEM_EXPLANATION]: `You are presenting a coding problem. Your job:
- Present the problem clearly with examples and constraints
- Wait for candidate to understand
- Ask: "Do you understand the problem? Any questions?"
Keep it simple and clear.`,

  [INTERVIEW_STEPS.STEP_2_CLARIFICATION]: `You are answering clarification questions about the problem.
- Answer their specific questions about the problem
- Be clear and concise
- Don't give solution hints
- After answering, ask: "Any other questions about the problem?"
- If no more questions, say: "Great! What's your approach to solve this?"`,

  [INTERVIEW_STEPS.STEP_3_SOLUTION_DISCUSSION]: `You are evaluating the candidate's proposed solution approach.

IMPORTANT: The candidate MUST explain their solution approach before they can proceed to coding.

If they ask to code without explaining their approach:
- Respond: "Please first explain your approach and solution strategy."
- Guide them to discuss their plan

If they give a detailed explanation (describing how they'll use techniques, what they'll compare, how they'll handle cases), then respond with:
- "Sounds good, go ahead and code it"
- "Got it, let's see the implementation" 
- "Alright, code it up"

ONLY ask questions if:
- They only mention the technique name without explaining HOW they'll use it
- Their explanation is vague or missing key details
- There's a fundamental flaw in their approach

Examples:
- If they say "I'll use two pointers" (vague) → Ask "How will you use two pointers to solve this?"
- If they explain the full algorithm with details → Don't ask questions, let them code

Keep responses under 15 words when letting them proceed to coding.`,

  [INTERVIEW_STEPS.STEP_4_CODING]: `You are monitoring the candidate while they code.
- Stay mostly SILENT while they code
- Only speak if:
  * They ask for help directly
  * They're clearly going in wrong direction (major logic error)
  * They're completely stuck for a while
- Responses should be minimal:
  * "You're on the right track, keep going"
  * "Think about what happens when..."
  * "Consider this edge case..."
- Don't give implementation details`,

  [INTERVIEW_STEPS.STEP_5_CODE_REVIEW]: `You are reviewing their completed code submission.

CRITICAL: You MUST carefully analyze their code for correctness and bugs.

Your job:
1. **Check for bugs**: Look for logical errors, edge case issues, syntax problems
2. **Test mentally**: Does this code actually solve the problem correctly?
3. **Ask ONE specific question** about their implementation:
   * "Walk me through this part of your code" 
   * "How does this handle [specific edge case]?"
   * "What happens if the input is [specific case]?"
   * "I see an issue here - what do you think happens when..."

If you find bugs or issues:
- Point them out with a question: "What happens if the array is empty?"
- Guide them to find the fix: "Think about what this line does when..."
- Don't give the solution directly

If the code looks correct:
- Ask about edge cases or test their understanding
- Focus on one specific part to verify they understand it

Don't summarize their code back to them. Ask ONE focused question to test understanding or find issues.`,

  [INTERVIEW_STEPS.STEP_6_FOLLOW_UP]: `You are asking follow-up questions about their solution.
- Ask about optimizations: "Can you think of a more efficient approach?"
- Ask about alternatives: "What other ways could you solve this?"
- Ask about trade-offs: "What are the pros and cons of your approach?"
- Keep questions focused and specific
- Don't give alternative solutions yourself`,

  [INTERVIEW_STEPS.STEP_7_COMPLEXITY]: `You are discussing time and space complexity.
- Ask: "What's the time complexity of your solution?"
- Ask: "What's the space complexity?"
- If they get it wrong, guide with questions:
  * "How many times does this loop run?"
  * "How much extra space are you using?"
- Confirm their analysis or help them correct it
- End with: "Great! That completes our interview."`
};

export const getStepPrompt = (step: InterviewStep): string => {
  return STEP_PROMPTS[step] || STEP_PROMPTS[INTERVIEW_STEPS.STEP_1_PROBLEM_EXPLANATION];
};

export const INTERVIEW_PROMPTS = {
  SYSTEM_PROMPT: `You are a technical interviewer. Follow the specific step-based prompts exactly.`,

  CODE_REVIEW_PROMPT: `Candidate submitted code. Ask ONE simple question about their solution:

For this {language} solution: {problemDescription}

Pick ONE area to probe:
- "How does this handle edge case X?"
- "What's the time complexity?"
- "Walk me through this part"

Don't explain anything - just ask one question.`,

  PROBLEM_PRESENTATION: `**{title}** ({difficulty})

{description}

{examples}{constraints}

Do you understand the problem? Any questions?`,

  COMPLETION: `Great! That completes our interview. Good work today!`,

  HINTS: {
    GENTLE: "What if you tried ",
    SPECIFIC: "Consider the case where ",
    ALGORITHMIC: "Maybe think about ",
    COMPLEXITY: "Time complexity?"
  }
};

export const CODING_PROBLEMS = {
  'array': [
    {
      id: 'two-sum',
      title: 'Two Sum',
      difficulty: 'Easy',
      category: 'array',
      description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
      examples: [
        {
          input: 'nums = [2,7,11,15], target = 9',
          output: '[0,1]',
          explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].'
        }
      ],
      constraints: [
        '2 <= nums.length <= 10^4',
        '-10^9 <= nums[i] <= 10^9',
        '-10^9 <= target <= 10^9',
        'Only one valid answer exists.'
      ]
    },
    {
      id: 'best-time-to-buy-sell-stock',
      title: 'Best Time to Buy and Sell Stock',
      difficulty: 'Easy',
      category: 'array',
      description: 'You are given an array prices where prices[i] is the price of a given stock on the ith day. You want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock.',
      examples: [
        {
          input: 'prices = [7,1,5,3,6,4]',
          output: '5',
          explanation: 'Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6-1 = 5.'
        }
      ],
      constraints: [
        '1 <= prices.length <= 10^5',
        '0 <= prices[i] <= 10^4'
      ]
    }
  ],
  'linked-list': [
    {
      id: 'reverse-linked-list',
      title: 'Reverse Linked List',
      difficulty: 'Easy',
      category: 'linked-list',
      description: 'Given the head of a singly linked list, reverse the list, and return the reversed list.',
      examples: [
        {
          input: 'head = [1,2,3,4,5]',
          output: '[5,4,3,2,1]'
        }
      ],
      constraints: [
        'The number of nodes in the list is the range [0, 5000].',
        '-5000 <= Node.val <= 5000'
      ]
    }
  ],
  'tree': [
    {
      id: 'maximum-depth-binary-tree',
      title: 'Maximum Depth of Binary Tree',
      difficulty: 'Easy',
      category: 'tree',
      description: 'Given the root of a binary tree, return its maximum depth.',
      examples: [
        {
          input: 'root = [3,9,20,null,null,15,7]',
          output: '3'
        }
      ],
      constraints: [
        'The number of nodes in the tree is in the range [0, 10^4].',
        '-100 <= Node.val <= 100'
      ]
    }
  ],
  'dynamic-programming': [
    {
      id: 'climbing-stairs',
      title: 'Climbing Stairs',
      difficulty: 'Easy',
      category: 'dynamic-programming',
      description: 'You are climbing a staircase. It takes n steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?',
      examples: [
        {
          input: 'n = 2',
          output: '2',
          explanation: 'There are two ways to climb to the top: 1+1 steps, or 2 steps.'
        }
      ],
      constraints: [
        '1 <= n <= 45'
      ]
    }
  ],
  'sorting': [
    {
      id: 'merge-sorted-array',
      title: 'Merge Sorted Array',
      difficulty: 'Easy',
      category: 'sorting',
      description: 'You are given two integer arrays nums1 and nums2, sorted in non-decreasing order, and two integers m and n, representing the number of elements in nums1 and nums2 respectively. Merge nums1 and nums2 into a single array sorted in non-decreasing order.',
      examples: [
        {
          input: 'nums1 = [1,2,3,0,0,0], m = 3, nums2 = [2,5,6], n = 3',
          output: '[1,2,2,3,5,6]'
        }
      ],
      constraints: [
        'nums1.length == m + n',
        'nums2.length == n',
        '0 <= m, n <= 200'
      ]
    }
  ],
  'hash-table': [
    {
      id: 'valid-anagram',
      title: 'Valid Anagram',
      difficulty: 'Easy',
      category: 'hash-table',
      description: 'Given two strings s and t, return true if t is an anagram of s, and false otherwise.',
      examples: [
        {
          input: 's = "anagram", t = "nagaram"',
          output: 'true'
        }
      ],
      constraints: [
        '1 <= s.length, t.length <= 5 * 10^4',
        's and t consist of lowercase English letters.'
      ]
    }
  ],
  'stack-queue': [
    {
      id: 'valid-parentheses',
      title: 'Valid Parentheses',
      difficulty: 'Easy',
      category: 'stack-queue',
      description: 'Given a string s containing just the characters \'(\', \')\', \'{\', \'}\', \'[\' and \']\', determine if the input string is valid.',
      examples: [
        {
          input: 's = "()"',
          output: 'true'
        },
        {
          input: 's = "()[]{}"',
          output: 'true'
        },
        {
          input: 's = "(]"',
          output: 'false'
        }
      ],
      constraints: [
        '1 <= s.length <= 10^4',
        's consists of parentheses only \'()[]{}\''
      ]
    }
  ],
  'math': [
    {
      id: 'palindrome-number',
      title: 'Palindrome Number',
      difficulty: 'Easy',
      category: 'math',
      description: 'Given an integer x, return true if x is palindrome integer.',
      examples: [
        {
          input: 'x = 121',
          output: 'true'
        }
      ],
      constraints: [
        '-2^31 <= x <= 2^31 - 1'
      ]
    }
  ],
  'two-pointers': [
    {
      id: 'valid-palindrome',
      title: 'Valid Palindrome',
      difficulty: 'Easy',
      category: 'two-pointers',
      description: 'A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward.',
      examples: [
        {
          input: 's = "A man, a plan, a canal: Panama"',
          output: 'true'
        }
      ],
      constraints: [
        '1 <= s.length <= 2 * 10^5',
        's consists only of printable ASCII characters.'
      ]
    }
  ],
  'sliding-window': [
    {
      id: 'maximum-subarray',
      title: 'Maximum Subarray',
      difficulty: 'Medium',
      category: 'sliding-window',
      description: 'Given an integer array nums, find the contiguous subarray (containing at least one number) which has the largest sum and return its sum.',
      examples: [
        {
          input: 'nums = [-2,1,-3,4,-1,2,1,-5,4]',
          output: '6',
          explanation: '[4,-1,2,1] has the largest sum = 6'
        }
      ],
      constraints: [
        '1 <= nums.length <= 10^5',
        '-10^4 <= nums[i] <= 10^4'
      ]
    }
  ]
};

export const getRandomProblem = (category: string, difficulty?: string) => {
  const categoryProblems = CODING_PROBLEMS[category as keyof typeof CODING_PROBLEMS];
  if (!categoryProblems) {
    return null;
  }

  let filteredProblems = categoryProblems;
  if (difficulty) {
    filteredProblems = categoryProblems.filter(p => p.difficulty === difficulty);
  }

  if (filteredProblems.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * filteredProblems.length);
  return filteredProblems[randomIndex];
};

export const parseLeetCodeUrl = (url: string): { problemSlug: string } | null => {
  const patterns = [
    /leetcode\.com\/problems\/([\w-]+)\/?/,
    /leetcode\.com\/problems\/([\w-]+)\/description\/?/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return { problemSlug: match[1] };
    }
  }
  
  return null;
}; 