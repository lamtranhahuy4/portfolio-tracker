'use client';

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  componentName?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * React Error Boundary component that catches JavaScript errors in child components.
 * Provides graceful fallback UI instead of crashing the entire app.
 * 
 * @example
 * <ErrorBoundary componentName="MarkToMarketGrid">
 *   <MarkToMarketGrid />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary]', {
      component: this.props.componentName,
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-6 rounded-xl border border-rose-900/50 bg-rose-950/20 text-rose-200">
          <AlertTriangle className="w-8 h-8 mb-3 text-rose-400" />
          <h3 className="text-lg font-semibold mb-2">
            {this.props.componentName ? `Lỗi trong ${this.props.componentName}` : 'Đã xảy ra lỗi'}
          </h3>
          <p className="text-sm text-rose-300/80 mb-4 text-center max-w-md">
            {this.state.error?.message || 'Vui lòng thử lại hoặc tải lại trang.'}
          </p>
          <button
            onClick={this.handleRetry}
            className="inline-flex items-center gap-2 px-4 py-2 bg-rose-900/50 hover:bg-rose-900/70 text-rose-200 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Thử lại
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Wrapper component with default styling for common use cases.
 */
export function SafeSection({
  children,
  name,
}: {
  children: ReactNode;
  name: string;
}) {
  return (
    <ErrorBoundary componentName={name}>
      {children}
    </ErrorBoundary>
  );
}
