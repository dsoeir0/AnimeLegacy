import { Component } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCw } from 'lucide-react';
import Button from './ui/Button';
import styles from './ErrorBoundary.module.css';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    if (typeof window !== 'undefined' && window?.console) {
      // eslint-disable-next-line no-console
      console.error('[ErrorBoundary]', error, info?.componentStack);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className={styles.wrap}>
        <div className={styles.card}>
          <div className={styles.iconWrap}>
            <AlertTriangle size={28} strokeWidth={1.75} />
          </div>
          <div className={styles.eyebrow}>UNEXPECTED ERROR</div>
          <h1 className={styles.title}>Something broke.</h1>
          <p className={styles.body}>
            We hit an error rendering this screen. Refreshing usually fixes it. If it keeps
            happening, let us know.
          </p>
          {this.state.error?.message ? (
            <pre className={styles.details}>{this.state.error.message}</pre>
          ) : null}
          <div className={styles.actions}>
            <Button variant="primary" size="md" icon={RotateCw} onClick={this.handleRetry}>
              Try again
            </Button>
            <Link href="/" className={styles.linkReset}>
              <Button variant="ghost" size="md">
                Go home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }
}
