import { Component, type ErrorInfo, type ReactNode } from 'react';
// Class components cannot use hooks — use the global translator (active language).
import { t } from '@/i18n';

interface Props {
  children: ReactNode;
  /** When true, shows a compact fallback (for use inside layouts). Otherwise shows full-page. */
  compact?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.compact) {
      return (
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="max-w-md text-center">
            <h2 className="mb-2 text-xl font-semibold text-foreground">
              {t('nav.errorTitle')}
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">
              {t('nav.errorSectionMessage')}
            </p>
            {this.state.error && (
              <p className="mb-4 rounded bg-muted p-2 text-xs text-muted-foreground font-mono break-all">
                {this.state.error.message}
              </p>
            )}
            <div className="flex justify-center gap-2">
              <button
                onClick={this.handleRetry}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                {t('common.retry')}
              </button>
              <button
                onClick={this.handleGoHome}
                className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
              >
                {t('nav.goHome')}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-muted">
        <div className="max-w-md text-center">
          <h1 className="mb-2 text-4xl font-bold text-foreground">Error</h1>
          <h2 className="mb-2 text-xl font-semibold text-foreground">
            {t('nav.errorTitle')}
          </h2>
          <p className="mb-4 text-muted-foreground">
            {t('nav.errorPageMessage')}
          </p>
          {this.state.error && (
            <p className="mb-6 rounded bg-background p-3 text-xs text-muted-foreground font-mono break-all">
              {this.state.error.message}
            </p>
          )}
          <div className="flex justify-center gap-3">
            <button
              onClick={this.handleReload}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {t('nav.reloadPage')}
            </button>
            <button
              onClick={this.handleGoHome}
              className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              {t('nav.goHome')}
            </button>
          </div>
        </div>
      </div>
    );
  }
}
