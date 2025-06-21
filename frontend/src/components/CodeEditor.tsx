import React, { useState, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { usePythonRunner } from '../hooks/usePythonRunner';

interface CodeEditorProps {
  language?: string;
  theme?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: (code: string) => void;
  readOnly?: boolean;
  height?: string;
  placeholder?: string;
}

interface ExecutionResult {
  output: string;
  error: string | null;
  executionTime: number;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  language = 'javascript',
  theme = 'vs-dark',
  value = '',
  onChange,
  onSubmit,
  readOnly = false,
  height = '400px',
  placeholder = '// Start coding here...\n'
}) => {
  const [code, setCode] = useState(value || placeholder);
  const [isLoading, setIsLoading] = useState(true);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [showOutput, setShowOutput] = useState(false);
  const editorRef = useRef<any>(null);

  // Initialize Python runner only for Python language
  const {
    isLoading: isPythonLoading,
    isReady: isPythonReady,
    isExecuting,
    error: pythonError,
    runPython
  } = usePythonRunner({ timeout: 15000 });

  const canExecute = language === 'python' && isPythonReady;

  const handleEditorDidMount = useCallback((editor: any, monaco: any) => {
    editorRef.current = editor;
    setIsLoading(false);

    // Configure editor options
    editor.updateOptions({
      fontSize: 14,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      lineNumbers: 'on',
      folding: true,
      selectOnLineNumbers: true,
      automaticLayout: true,
    });

    // Add keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      if (canExecute) {
        handleExecute();
      } else if (onSubmit) {
        onSubmit(editor.getValue());
      }
    });

    // Add Shift+Enter for execution (alternative shortcut)
    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => {
      if (canExecute) {
        handleExecute();
      }
    });

    // Focus the editor
    editor.focus();
  }, [onSubmit, canExecute]);

  const handleEditorChange = useCallback((value: string | undefined) => {
    const newValue = value || '';
    setCode(newValue);
    if (onChange) {
      onChange(newValue);
    }
  }, [onChange]);

  const handleSubmit = useCallback(() => {
    if (onSubmit && code.trim()) {
      onSubmit(code);
    }
  }, [onSubmit, code]);

  const handleReset = useCallback(() => {
    const resetValue = placeholder;
    setCode(resetValue);
    if (editorRef.current) {
      editorRef.current.setValue(resetValue);
    }
    if (onChange) {
      onChange(resetValue);
    }
  }, [placeholder, onChange]);

  const formatCode = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument').run();
    }
  }, []);

  const handleExecute = useCallback(async () => {
    if (!canExecute || !code.trim()) return;

    try {
      setShowOutput(true);
      const result = await runPython(code);
      setExecutionResult(result);
    } catch (err: any) {
      setExecutionResult({
        output: '',
        error: err.message || 'Execution failed',
        executionTime: 0
      });
    }
  }, [canExecute, code, runPython]);

  return (
    <div className="code-editor">
      <div className="code-editor-header">
        <div className="code-editor-info">
          <span className="language-indicator">{language.toUpperCase()}</span>
          {isLoading && <span className="loading-indicator">Loading editor...</span>}
          {language === 'python' && isPythonLoading && (
            <span className="loading-indicator">Loading Python runtime...</span>
          )}
          {language === 'python' && pythonError && (
            <span className="error-indicator">Python: {pythonError}</span>
          )}
          {language === 'python' && isPythonReady && (
            <span className="ready-indicator">Python: Ready</span>
          )}
        </div>
        
        <div className="code-editor-controls">
          {canExecute && (
            <button
              className="editor-button run-button"
              onClick={handleExecute}
              disabled={readOnly || isLoading || isExecuting || !code.trim()}
              title="Run Python code (Ctrl/Cmd + Enter or Shift + Enter)"
            >
              {isExecuting ? '⏳ Running...' : '▶️ Run'}
            </button>
          )}
          
          <button
            className="editor-button format-button"
            onClick={formatCode}
            disabled={readOnly || isLoading}
            title="Format code (prettier)"
          >
            📐 Format
          </button>
          
          <button
            className="editor-button reset-button"
            onClick={handleReset}
            disabled={readOnly || isLoading}
            title="Reset to template"
          >
            🔄 Reset
          </button>
          
          {onSubmit && (
            <button
              className="editor-button submit-button"
              onClick={handleSubmit}
              disabled={readOnly || isLoading || !code.trim()}
              title="Submit code (Ctrl/Cmd + Enter)"
            >
              🚀 Submit Code
            </button>
          )}
        </div>
      </div>

      <div className="code-editor-container">
        <Editor
          height={height}
          language={language}
          theme={theme}
          value={code}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          loading={<div className="editor-loading">Loading Monaco Editor...</div>}
          options={{
            readOnly,
            selectOnLineNumbers: true,
            roundedSelection: false,
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
      </div>

      {/* Output Panel */}
      {showOutput && executionResult && (
        <div className="code-output-panel">
          <div className="output-header">
            <div className="output-title">
              📄 Output 
              {executionResult.executionTime > 0 && (
                <span className="execution-time">({executionResult.executionTime}ms)</span>
              )}
            </div>
            <button
              className="close-output-button"
              onClick={() => setShowOutput(false)}
              title="Close output panel"
            >
              ✕
            </button>
          </div>
          
          <div className="output-content">
            {executionResult.output && (
              <div className="output-section">
                <div className="output-label">Output:</div>
                <pre className="output-text output-success">{executionResult.output}</pre>
              </div>
            )}
            
            {executionResult.error && (
              <div className="output-section">
                <div className="output-label">Error:</div>
                <pre className="output-text output-error">{executionResult.error}</pre>
              </div>
            )}
            
            {!executionResult.output && !executionResult.error && (
              <div className="output-section">
                <div className="output-text output-empty">No output produced</div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="code-editor-footer">
        <div className="editor-stats">
          Lines: {code.split('\n').length} | 
          Characters: {code.length}
        </div>
        
        {!readOnly && (
          <div className="editor-shortcuts">
            {canExecute ? (
              <span>Ctrl/Cmd + Enter or Shift + Enter to run • Ctrl/Cmd + Enter to submit</span>
            ) : (
              <span>Ctrl/Cmd + Enter to submit</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CodeEditor; 