import React from 'react';

interface InterviewStepsProps {
  currentStep: string;
  onStepChange: (step: string) => void;
  disabled?: boolean;
}

const INTERVIEW_STEPS = {
  STEP_1_PROBLEM_EXPLANATION: 'problem_explanation',
  STEP_2_CLARIFICATION: 'clarification', 
  STEP_3_SOLUTION_DISCUSSION: 'solution_discussion',
  STEP_4_CODING: 'coding',
  STEP_5_CODE_REVIEW: 'code_review',
  STEP_6_FOLLOW_UP: 'follow_up',
  STEP_7_COMPLEXITY: 'complexity'
};

const STEP_LABELS = {
  [INTERVIEW_STEPS.STEP_1_PROBLEM_EXPLANATION]: '1. Problem Explanation',
  [INTERVIEW_STEPS.STEP_2_CLARIFICATION]: '2. Clarification',
  [INTERVIEW_STEPS.STEP_3_SOLUTION_DISCUSSION]: '3. Solution Discussion',
  [INTERVIEW_STEPS.STEP_4_CODING]: '4. Coding',
  [INTERVIEW_STEPS.STEP_5_CODE_REVIEW]: '5. Code Review',
  [INTERVIEW_STEPS.STEP_6_FOLLOW_UP]: '6. Follow-up Questions',
  [INTERVIEW_STEPS.STEP_7_COMPLEXITY]: '7. Complexity Analysis'
};

const STEP_DESCRIPTIONS = {
  [INTERVIEW_STEPS.STEP_1_PROBLEM_EXPLANATION]: 'Interviewer presents the problem',
  [INTERVIEW_STEPS.STEP_2_CLARIFICATION]: 'Ask questions about the problem',
  [INTERVIEW_STEPS.STEP_3_SOLUTION_DISCUSSION]: 'Discuss your approach',
  [INTERVIEW_STEPS.STEP_4_CODING]: 'Write your solution',
  [INTERVIEW_STEPS.STEP_5_CODE_REVIEW]: 'Review and explain your code',
  [INTERVIEW_STEPS.STEP_6_FOLLOW_UP]: 'Discuss optimizations and alternatives',
  [INTERVIEW_STEPS.STEP_7_COMPLEXITY]: 'Analyze time and space complexity'
};

const InterviewSteps: React.FC<InterviewStepsProps> = ({ 
  currentStep, 
  onStepChange, 
  disabled = false 
}) => {
  const steps = Object.values(INTERVIEW_STEPS);
  const currentIndex = steps.indexOf(currentStep);

  return (
    <div className="interview-steps">
      <div className="steps-header">
        <h3>📋 Interview Steps</h3>
        <div className="step-controls">
          <button 
            onClick={() => onStepChange('previous')}
            disabled={disabled || currentIndex === 0}
            className="step-nav-button"
          >
            ← Previous
          </button>
          <button 
            onClick={() => onStepChange('next')}
            disabled={disabled || currentIndex === steps.length - 1}
            className="step-nav-button"
          >
            Next →
          </button>
        </div>
      </div>
      
      <div className="steps-list">
        {steps.map((step, index) => (
          <div
            key={step}
            className={`step-item ${step === currentStep ? 'active' : ''} ${
              index < currentIndex ? 'completed' : ''
            }`}
            onClick={() => !disabled && onStepChange(step)}
          >
            <div className="step-number">{index + 1}</div>
            <div className="step-content">
              <div className="step-label">{STEP_LABELS[step]}</div>
              <div className="step-description">{STEP_DESCRIPTIONS[step]}</div>
            </div>
            {step === currentStep && <div className="step-indicator">▶</div>}
          </div>
        ))}
      </div>
      
      <div className="current-step-info">
        <strong>Current:</strong> {STEP_LABELS[currentStep]}
        <br />
        <em>{STEP_DESCRIPTIONS[currentStep]}</em>
      </div>
    </div>
  );
};

export default InterviewSteps; 