import React from 'react';
import './App.css';
import InterviewPanel from './components/InterviewPanel';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>🎤 Mock Interview Assistant</h1>
        <p>Practice LeetCode problems with AI interviewer</p>
      </header>
      <main className="App-main">
        <InterviewPanel />
      </main>
    </div>
  );
}

export default App; 