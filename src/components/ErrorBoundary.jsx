import { Component } from 'react';
import Icon from './Icon.jsx';

/** Keeps one broken page from blanking the whole app, and offers a reload. */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="card card-pad flex flex-col items-center py-12 text-center">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-red-50 text-red-600"><Icon name="alert" size={20} /></span>
        <h2 className="mt-4 text-base font-semibold">This section could not load</h2>
        <p className="mt-1.5 max-w-md text-sm text-ink-500">{this.state.error.message}</p>
        <button className="btn-primary mt-5" onClick={() => window.location.reload()}><Icon name="refresh" size={15} /> Reload page</button>
      </div>
    );
  }
}
