import { useState, useEffect, useRef, useCallback } from 'react';

interface ExecutionResult {
  output: string;
  error: string | null;
  executionTime: number;
}

interface PythonRunnerOptions {
  timeout?: number;
}

export const usePythonRunner = (options: PythonRunnerOptions = {}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const pyodideRef = useRef<any>(null);
  const { timeout = 10000 } = options;

  // Initialize Pyodide
  useEffect(() => {
    const initializePyodide = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Load Pyodide from CDN
        const pyodide = await (window as any).loadPyodide({
          indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/',
          stdout: (text: string) => {
            // Handle stdout - will be captured during execution
            console.log('Python stdout:', text);
          },
          stderr: (text: string) => {
            // Handle stderr - will be captured during execution
            console.error('Python stderr:', text);
          }
        });
        
        pyodideRef.current = pyodide;
        setIsReady(true);
        setIsLoading(false);
        
        console.log('Pyodide initialized successfully');
      } catch (err) {
        console.error('Failed to initialize Pyodide:', err);
        setError('Failed to initialize Python runtime');
        setIsLoading(false);
      }
    };

    // Check if Pyodide is already loaded
    if (!(window as any).loadPyodide) {
      // Load Pyodide script
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js';
      script.onload = () => initializePyodide();
      script.onerror = () => {
        setError('Failed to load Python runtime');
        setIsLoading(false);
      };
      document.head.appendChild(script);
    } else {
      initializePyodide();
    }
  }, []);

  const runPython = useCallback(async (code: string): Promise<ExecutionResult> => {
    if (!isReady || !pyodideRef.current) {
      throw new Error('Python runtime not ready');
    }

    setIsExecuting(true);
    const startTime = Date.now();
    let output = '';
    let error: string | null = null;

    try {
      // Simpler approach: use runPython directly and capture via globals
      const wrappedCode = `
import sys
import io
import traceback

# Create string buffers for output
_stdout_buffer = io.StringIO()
_stderr_buffer = io.StringIO()

# Save original stdout/stderr
_original_stdout = sys.stdout
_original_stderr = sys.stderr

try:
    # Redirect stdout/stderr
    sys.stdout = _stdout_buffer
    sys.stderr = _stderr_buffer
    
    # Execute user code
    exec("""${code.replace(/"/g, '\\"').replace(/\n/g, '\\n')}""")
    
except Exception as e:
    # Capture the exception
    traceback.print_exc(file=_stderr_buffer)
    
finally:
    # Restore original stdout/stderr
    sys.stdout = _original_stdout
    sys.stderr = _original_stderr

# Get the captured output
_captured_output = _stdout_buffer.getvalue()
_captured_error = _stderr_buffer.getvalue()

# Clean up
_stdout_buffer.close()
_stderr_buffer.close()
`;

      // Execute the wrapped code
      pyodideRef.current.runPython(wrappedCode);
      
      // Get the captured output from Python globals
      const capturedOutput = pyodideRef.current.globals.get('_captured_output');
      const capturedError = pyodideRef.current.globals.get('_captured_error');
      
      output = capturedOutput || '';
      error = capturedError && capturedError.trim() ? capturedError : null;
      
      console.log('Python execution completed:', { output, error });
      
    } catch (err: any) {
      error = err.message || 'Execution failed';
      console.error('Python execution error:', err);
    } finally {
      setIsExecuting(false);
    }

    const executionTime = Date.now() - startTime;
    
    return {
      output: output.trim(),
      error,
      executionTime
    };
  }, [isReady, timeout]);

  const installPackage = useCallback(async (packageName: string): Promise<boolean> => {
    if (!isReady || !pyodideRef.current) {
      return false;
    }

    try {
      await pyodideRef.current.loadPackage(packageName);
      return true;
    } catch (err) {
      console.error(`Failed to install package ${packageName}:`, err);
      return false;
    }
  }, [isReady]);

  const getAvailablePackages = useCallback(async (): Promise<string[]> => {
    if (!isReady || !pyodideRef.current) {
      return [];
    }

    try {
      // Get list of available packages
      const response = await fetch('https://cdn.jsdelivr.net/pyodide/v0.24.1/full/packages.json');
      const packages = await response.json();
      return Object.keys(packages.packages);
    } catch (err) {
      console.error('Failed to get available packages:', err);
      return [];
    }
  }, [isReady]);

  return {
    isLoading,
    isReady,
    isExecuting,
    error,
    runPython,
    installPackage,
    getAvailablePackages
  };
}; 