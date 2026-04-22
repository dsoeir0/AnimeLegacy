import { Component } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { translate } from 'react-switch-lang';
import Button from './ui/Button';
import styles from './ErrorBoundary.module.css';

// Note: this component catches rendering errors. If translation setup itself
// is broken, t() will return the key literal — a readable degradation. We
// accept that over a hard crash.
class ErrorBoundary extends Component {
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
    const { t } = this.props;
    return (
      <div className={styles.wrap}>
        <div className={styles.card}>
          <div className={styles.iconWrap}>
            <AlertTriangle size={28} strokeWidth={1.75} />
          </div>
          <div className={styles.eyebrow}>{t('errorBoundary.eyebrow')}</div>
          <h1 className={styles.title}>{t('errorBoundary.title')}</h1>
          <p className={styles.body}>{t('errorBoundary.body')}</p>
          {this.state.error?.message ? (
            <pre className={styles.details}>{this.state.error.message}</pre>
          ) : null}
          <div className={styles.actions}>
            <Button variant="primary" size="md" icon={RotateCw} onClick={this.handleRetry}>
              {t('errorBoundary.tryAgain')}
            </Button>
            <Link href="/" className={styles.linkReset}>
              <Button variant="ghost" size="md">
                {t('errorBoundary.goHome')}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }
}

export default translate(ErrorBoundary);
