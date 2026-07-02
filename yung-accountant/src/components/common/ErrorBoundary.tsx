import React, { Component } from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * ErrorBoundary — catches render errors (including lazy chunk load failures).
 * Instead of a dead black screen or error message, renders a page skeleton
 * that looks like the page is loading. The thin OfflineBanner already tells
 * the user they're offline — no need for additional error messaging.
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      // Page shell with skeletons — looks like loading, not broken
      return (
        <div className="max-w-7xl mx-auto pb-24 animate-fade-in-up">
          {/* Fake page header */}
          <div className="mb-10 pt-4">
            <div className="skeleton h-9 w-48 rounded-xl mb-2" />
            <div className="skeleton h-4 w-64 rounded-lg" />
          </div>
          {/* Skeleton grid — same as what pages show when loading */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton rounded-[1.5rem] p-6" style={{ minHeight: '160px' }}>
                <div className="h-5 w-2/3 rounded-lg mb-4" style={{ background: 'var(--theme-background-glass-hover)' }} />
                <div className="h-3 w-full rounded-lg mb-2" style={{ background: 'var(--theme-background-glass-hover)', opacity: 0.5 }} />
                <div className="h-3 w-4/5 rounded-lg" style={{ background: 'var(--theme-background-glass-hover)', opacity: 0.5 }} />
              </div>
            ))}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
