import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { beginGoogleLogin, clearSession, fetchCurrentUser, getStoredToken, getStoredUser } from '../auth';

function roleLabel(requiredRole) {
  return requiredRole === 'manager' ? 'manager' : 'employee';
}

export default function StaffAccessPage({ requiredRole, title, description, children }) {
  const [authState, setAuthState] = useState('checking');
  const [user, setUser] = useState(getStoredUser());
  const [error, setError] = useState('');

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setAuthState('signed_out');
      return;
    }

    fetchCurrentUser()
      .then((currentUser) => {
        setUser(currentUser);
        setAuthState('signed_in');
      })
      .catch(() => {
        clearSession();
        setUser(null);
        setAuthState('signed_out');
      });
  }, []);

  function handleLogout() {
    clearSession();
    setUser(null);
    setAuthState('signed_out');
    setError('');
  }

  const hasRequiredRole = user && (requiredRole === 'employee'
    ? ['employee', 'manager'].includes(user.role)
    : user.role === 'manager');

  if (authState === 'checking') {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <p style={styles.kicker}>Secured Staff Access</p>
          <h1 style={styles.title}>Checking your session...</h1>
        </div>
      </div>
    );
  }

  if (!user || authState === 'signed_out') {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <p style={styles.kicker}>Secured Staff Access</p>
          <h1 style={styles.title}>{title}</h1>
          <p style={styles.subtitle}>{description}</p>
          <div style={styles.form}>
            <p style={styles.helperText}>
              Continue with your staff Google account. That Google email must match an employee record in the
              backend database.
            </p>
            {error ? <p style={styles.error}>{error}</p> : null}
            <button
              style={styles.button}
              type="button"
              onClick={() => beginGoogleLogin(window.location.pathname)}
            >
              Continue with Google for {roleLabel(requiredRole)} access
            </button>
          </div>
          <Link to="/" style={styles.link}>Back to portal</Link>
        </div>
      </div>
    );
  }

  if (!hasRequiredRole) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <p style={styles.kicker}>Secured Staff Access</p>
          <h1 style={styles.title}>Access restricted</h1>
          <p style={styles.subtitle}>
            You are signed in as {user.firstName} {user.lastName} ({user.jobTitle}), but this page
            requires {roleLabel(requiredRole)} access.
          </p>
          <div style={styles.actions}>
            <button style={styles.button} type="button" onClick={handleLogout}>Sign out</button>
            <Link to="/" style={styles.link}>Return to portal</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    children ?? (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.header}>
            <div>
              <p style={styles.kicker}>Authenticated Staff View</p>
              <h1 style={styles.title}>{title}</h1>
              <p style={styles.subtitle}>{description}</p>
            </div>
            <div style={styles.userCard}>
              <strong>{user.firstName} {user.lastName}</strong>
              <span>{user.jobTitle}</span>
              <span>{user.email}</span>
            </div>
          </div>

          <div style={styles.panel}>
            <h2 style={styles.sectionTitle}>Access granted</h2>
            <p style={styles.panelText}>Google OAuth is active for this section, with a server-issued staff session.</p>
          </div>

          <div style={styles.actions}>
            <button style={styles.button} type="button" onClick={handleLogout}>Sign out</button>
            <Link to="/" style={styles.link}>Return to portal</Link>
          </div>
        </div>
      </div>
    )
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
    maxWidth: '920px',
    margin: '0 auto',
    background: '#fffaf4',
    borderRadius: '28px',
    padding: '32px',
    boxShadow: '0 22px 50px rgba(83, 52, 34, 0.12)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '24px',
    flexWrap: 'wrap'
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
  form: {
    display: 'grid',
    gap: '16px',
    maxWidth: '460px',
    marginTop: '28px'
  },
  button: {
    border: 'none',
    borderRadius: '999px',
    padding: '12px 18px',
    background: '#8d5231',
    color: '#fff',
    fontWeight: 700,
    cursor: 'pointer'
  },
  link: {
    display: 'inline-block',
    marginTop: '18px',
    color: '#6d3d1f',
    fontWeight: 700,
    textDecoration: 'none'
  },
  error: {
    margin: 0,
    color: '#a12f2f',
    fontWeight: 600
  },
  helperText: {
    margin: 0,
    color: '#5f4a3c',
    lineHeight: 1.6
  },
  userCard: {
    minWidth: '240px',
    display: 'grid',
    gap: '4px',
    alignSelf: 'start',
    padding: '16px',
    borderRadius: '18px',
    background: '#f7ede2',
    color: '#5c493b'
  },
  panel: {
    marginTop: '28px',
    padding: '22px',
    borderRadius: '22px',
    background: '#f8efe4'
  },
  sectionTitle: {
    margin: '0 0 10px',
    color: '#4a2b18'
  },
  panelText: {
    margin: 0,
    color: '#655247',
    lineHeight: 1.6
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
    marginTop: '24px'
  }
};
