import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { DebugProvider } from './contexts/DebugContext';
import ErrorBoundary from './components/ErrorBoundary';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <DebugProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </DebugProvider>
  </React.StrictMode>
);
