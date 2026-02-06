import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public readonly state: ErrorBoundaryState;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('🔴 ErrorBoundary caught an error:', error, errorInfo);
    // Update state with errorInfo
    (this as any).setState({
      errorInfo
    });
  }

  private handleReset = (): void => {
    const confirmReset = window.confirm(
      'This will clear all local data and reload the app. Continue?'
    );
    
    if (confirmReset) {
      localStorage.clear();
      window.location.reload();
    }
  };

  public render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full border border-red-200">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900">Something went wrong</h1>
                <p className="text-gray-500 font-medium">The application encountered an error</p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
              <p className="text-sm font-bold text-red-800 mb-2">Error Details:</p>
              <p className="text-sm text-red-700 font-mono break-words">
                {this.state.error?.toString()}
              </p>
            </div>

            {this.state.errorInfo && (
              <details className="mb-6">
                <summary className="cursor-pointer text-sm font-bold text-gray-700 hover:text-gray-900">
                  Show Stack Trace
                </summary>
                <pre className="mt-2 text-xs bg-gray-100 p-4 rounded-xl overflow-auto max-h-64">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            <div className="flex space-x-4">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-indigo-600 text-white py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-colors"
              >
                🔄 Reload Page
              </button>
              <button
                onClick={this.handleReset}
                className="flex-1 bg-red-600 text-white py-3 rounded-2xl font-bold hover:bg-red-700 transition-colors"
              >
                🧹 Reset & Clear Data
              </button>
            </div>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
              <p className="text-sm text-blue-800">
                <span className="font-bold">💡 Tip:</span> If this keeps happening, try clearing your browser cache or check the browser console for more details.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
