import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';

function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full text-center space-y-4">
        <AlertTriangle className="w-16 h-16 text-destructive mx-auto" />
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="text-muted-foreground">
          We encountered an unexpected error. Our team has been notified.
        </p>
        <div className="space-y-2">
          <Button onClick={resetErrorBoundary} size="lg">
            Try again
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/'}>
            Go to homepage
          </Button>
        </div>
        {import.meta.env.DEV && (
          <details className="mt-4 text-left">
            <summary className="cursor-pointer text-sm text-muted-foreground">Error details</summary>
            <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
              {error.message}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ReactErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, errorInfo) => {
        // Log to error tracking service (add Sentry later)
        logger.error('ErrorBoundary caught:', error, errorInfo);
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
}
