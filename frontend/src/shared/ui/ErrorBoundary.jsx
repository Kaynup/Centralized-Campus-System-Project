import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // MOCK — replace with real logging (Sentry, LogRocket, etc.) once chosen.
    console.error("ErrorBoundary caught:", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-lg font-semibold text-slate">This page hit a problem.</p>
          <p className="max-w-sm text-sm text-slate/60">
            Try reloading this section. If it keeps happening, let your admin know.
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="mt-2 rounded-md bg-forest px-4 py-2 text-sm font-semibold text-white hover:bg-forest/90"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}