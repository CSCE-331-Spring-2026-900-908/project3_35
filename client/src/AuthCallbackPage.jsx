import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { clearSession, completeGoogleLoginFromHash, consumePostLoginPath } from './auth';

export default function AuthCallbackPage() {
  const [error, setError] = useState('');
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) {
      return;
    }
    hasProcessed.current = true;

    try {
      clearSession();
      completeGoogleLoginFromHash();
      window.location.replace(consumePostLoginPath() || '/');
    } catch (callbackError) {
      setError(callbackError.message || 'Google sign-in failed.');
    }
  }, []);

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <p style={styles.kicker}>Google Sign-In</p>
        <h1 style={styles.title}>{error ? 'Sign-in failed' : 'Finishing sign-in...'}</h1>
        <p style={styles.subtitle}>
          {error || 'We are securing your staff session and sending you back to the app.'}
        </p>
        {error ? <Link to="/" style={styles.link}>Return to portal</Link> : null}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    padding: '32px',
    background: 'linear-gradient(135deg, #f6ecdf 0%, #eadbc6 100%)',
    fontFamily: 'system-ui, sans-serif'
  },
  card: {
    maxWidth: '720px',
    margin: '0 auto',
    background: '#fffaf4',
    borderRadius: '28px',
    padding: '32px',
    boxShadow: '0 22px 50px rgba(83, 52, 34, 0.12)'
  },
  kicker: {
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: '#7d614a',
    fontWeight: 700,
    margin: '0 0 12px'
  },
  title: {
    fontSize: '3rem',
    lineHeight: 1,
    color: '#342117',
    margin: '0 0 12px'
  },
  subtitle: {
    color: '#6c5a4f',
    fontSize: '1.05rem',
    lineHeight: 1.5,
    maxWidth: '60ch',
    margin: 0
  },
  link: {
    display: 'inline-block',
    marginTop: '18px',
    color: '#6d3d1f',
    fontWeight: 700,
    textDecoration: 'none'
  }
};
