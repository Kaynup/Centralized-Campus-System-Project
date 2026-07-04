import { Component } from "react";

/**
 * ErrorBoundary
 * ------------------------------------------------------------------
 * Error boundaries only work as class components — there's no Hook
 * equivalent for componentDidCatch, so this can't be written as a
 * function component.
 *
 * Where to use it: wrap each module's route (not the whole <App/>),
 * so a crash in, say, the Marketplace module shows a contained "this
 * page hit a problem" screen instead of taking down Equipment Rental
 * and Facility Reservation with it. See the module route stubs for
 * the wrapping pattern.
 *
 * This catches render/lifecycle errors only — it does NOT catch
 * errors inside event handlers or async code (login failures, wallet
 * charges, etc.). Those are handled by parseApiError + try/catch at
 * the call site, same as AuthContext and WalletContext already do.
 * ------------------------------------------------------------------
 */
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