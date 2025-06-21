import React, { useState } from 'react';

interface ProblemSetupProps {
  onProblemSelected: (problem: ProblemConfig) => void;
  onCancel: () => void;
}

interface ProblemConfig {
  type: 'url' | 'category';
  url?: string;
  category?: string;
  difficulty?: string;
}

const PROBLEM_CATEGORIES = [
  { id: 'array', name: 'Array & Strings', description: 'Basic data manipulation' },
  { id: 'linked-list', name: 'Linked Lists', description: 'Pointer manipulation' },
  { id: 'tree', name: 'Trees & Graphs', description: 'Hierarchical structures' },
  { id: 'dynamic-programming', name: 'Dynamic Programming', description: 'Optimization problems' },
  { id: 'sorting', name: 'Sorting & Searching', description: 'Algorithm fundamentals' },
  { id: 'hash-table', name: 'Hash Tables', description: 'Key-value lookups' },
  { id: 'stack-queue', name: 'Stack & Queue', description: 'LIFO/FIFO structures' },
  { id: 'math', name: 'Math & Logic', description: 'Mathematical problems' },
  { id: 'two-pointers', name: 'Two Pointers', description: 'Efficient array traversal' },
  { id: 'sliding-window', name: 'Sliding Window', description: 'Subarray problems' }
];

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

const ProblemSetup: React.FC<ProblemSetupProps> = ({ onProblemSelected, onCancel }) => {
  const [setupType, setSetupType] = useState<'url' | 'category'>('category');
  const [url, setUrl] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('Medium');
  const [isValidUrl, setIsValidUrl] = useState(true);

  const validateLeetCodeUrl = (url: string): boolean => {
    const patterns = [
      /^https?:\/\/(www\.)?leetcode\.com\/problems\/[\w-]+\/?$/,
      /^https?:\/\/(www\.)?leetcode\.com\/problems\/[\w-]+\/description\/?$/
    ];
    return patterns.some(pattern => pattern.test(url));
  };

  const handleUrlChange = (value: string) => {
    setUrl(value);
    if (value.trim()) {
      setIsValidUrl(validateLeetCodeUrl(value.trim()));
    } else {
      setIsValidUrl(true);
    }
  };

  const handleSubmit = () => {
    if (setupType === 'url') {
      if (!url.trim() || !isValidUrl) {
        alert('Please enter a valid LeetCode problem URL');
        return;
      }
      onProblemSelected({
        type: 'url',
        url: url.trim()
      });
    } else {
      if (!selectedCategory) {
        alert('Please select a problem category');
        return;
      }
      onProblemSelected({
        type: 'category',
        category: selectedCategory,
        difficulty: selectedDifficulty
      });
    }
  };

  return (
    <div className="problem-setup-overlay">
      <div className="problem-setup-modal">
        <div className="problem-setup-header">
          <h2>🎯 Choose Your Problem</h2>
          <button className="close-button" onClick={onCancel}>×</button>
        </div>

        <div className="setup-options">
          <div className="option-tabs">
            <button
              className={`option-tab ${setupType === 'category' ? 'active' : ''}`}
              onClick={() => setSetupType('category')}
            >
              📚 Browse Categories
            </button>
            <button
              className={`option-tab ${setupType === 'url' ? 'active' : ''}`}
              onClick={() => setSetupType('url')}
            >
              🔗 Paste LeetCode Link
            </button>
          </div>

          {setupType === 'url' ? (
            <div className="url-setup">
              <div className="input-group">
                <label>LeetCode Problem URL:</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="https://leetcode.com/problems/two-sum/"
                  className={`url-input ${!isValidUrl ? 'invalid' : ''}`}
                />
                {!isValidUrl && (
                  <div className="error-message">
                    Please enter a valid LeetCode problem URL
                  </div>
                )}
              </div>
              <div className="url-examples">
                <p><strong>Examples:</strong></p>
                <ul>
                  <li>https://leetcode.com/problems/two-sum/</li>
                  <li>https://leetcode.com/problems/valid-parentheses/</li>
                  <li>https://leetcode.com/problems/merge-two-sorted-lists/</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="category-setup">
              <div className="difficulty-selector">
                <label>Difficulty Level:</label>
                <div className="difficulty-buttons">
                  {DIFFICULTIES.map(difficulty => (
                    <button
                      key={difficulty}
                      className={`difficulty-button ${selectedDifficulty === difficulty ? 'active' : ''} ${difficulty.toLowerCase()}`}
                      onClick={() => setSelectedDifficulty(difficulty)}
                    >
                      {difficulty}
                    </button>
                  ))}
                </div>
              </div>

              <div className="category-grid">
                <label>Problem Category:</label>
                <div className="categories">
                  {PROBLEM_CATEGORIES.map(category => (
                    <div
                      key={category.id}
                      className={`category-card ${selectedCategory === category.id ? 'selected' : ''}`}
                      onClick={() => setSelectedCategory(category.id)}
                    >
                      <h4>{category.name}</h4>
                      <p>{category.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="setup-actions">
          <button className="cancel-button" onClick={onCancel}>
            Cancel
          </button>
          <button className="start-button" onClick={handleSubmit}>
            Start Interview
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProblemSetup; 