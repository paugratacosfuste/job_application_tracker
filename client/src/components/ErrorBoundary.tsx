import React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  handleGoHome = (): void => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[400px] items-center justify-center p-6 bg-[hsl(var(--background))]">
          <Card className="w-full max-w-md border-[hsl(var(--border))] bg-[hsl(var(--card))]">
            <CardContent className="flex flex-col items-center gap-4 p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--muted))]">
                <AlertTriangle className="h-6 w-6 text-[hsl(var(--muted-foreground))]" />
              </div>
              <h2 className="text-xl font-semibold text-[hsl(var(--foreground))]">
                Something went wrong
              </h2>
              {this.state.error && (
                <p className="text-center text-sm text-[hsl(var(--muted-foreground))]">
                  {this.state.error.message}
                </p>
              )}
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={this.handleReset}>
                  Try Again
                </Button>
                <Button onClick={this.handleGoHome}>
                  Go Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
