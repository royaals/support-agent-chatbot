import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center">
                        <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
                        <h2 className="text-red-800 font-medium">Something went wrong</h2>
                    </div>
                    <p className="text-red-600 mt-2">{this.state.error?.message}</p>
                    <button
                        onClick={() => this.setState({ hasError: false })}
                        className="mt-4 text-sm text-red-600 hover:text-red-800"
                    >
                        Try again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}