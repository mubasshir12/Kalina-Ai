import React, { Component, ErrorInfo } from 'react';
import { useDebug } from '../contexts/DebugContext';

interface Props {
    children: React.ReactNode;
    logError: (error: any) => void;
}

class ErrorBoundaryInternal extends Component<Props> {
    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Create a synthetic error object to pass to the logger
        const syntheticError = {
            message: `React render error: ${error.message}`,
            stack: errorInfo.componentStack,
        };
        this.props.logError(syntheticError);
    }

    render() {
        return this.props.children;
    }
}

const ErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { logError } = useDebug();
    return <ErrorBoundaryInternal logError={logError}>{children}</ErrorBoundaryInternal>;
};

export default ErrorBoundary;
