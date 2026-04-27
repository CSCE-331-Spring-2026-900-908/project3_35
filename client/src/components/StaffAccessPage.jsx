import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { beginGoogleLogin, clearSession, fetchCurrentUser, getStoredToken, getStoredUser, loginWithPin } from '../auth';

function roleLabel(requiredRole) {
  return requiredRole === 'manager' ? 'manager' : 'staff';
}

function formatDisplayName(user) {
  const firstName = String(user?.firstName || '').trim();
  const lastName = String(user?.lastName || '').trim();
  const jobTitle = String(user?.jobTitle || '').trim();

  if (!firstName) {
    return [firstName, lastName].filter(Boolean).join(' ');
  }

  const compactJobTitle = jobTitle.replace(/\s+/g, '').toLowerCase();
  const compactFirstName = firstName.replace(/\s+/g, '');

  if (
    compactJobTitle
    && compactFirstName.toLowerCase().startsWith(compactJobTitle)
    && compactFirstName.length > compactJobTitle.length
  ) {
    const suffix = compactFirstName.slice(compactJobTitle.length);
    const normalizedFirstName = `${jobTitle} ${suffix}`.trim();
    return [normalizedFirstName, lastName].filter(Boolean).join(' ');
  }

  return [firstName, lastName].filter(Boolean).join(' ');
}

export default function StaffAccessPage({
  requiredRole,
  title,
  description,
  accessDeniedMessage,
  authMethod = 'google',
  requiredAuthMethod = null,
  children
}) {
  const [authState, setAuthState] = useState('checking');
  const [user, setUser] = useState(getStoredUser());
  const [error, setError] = useState('');
  const [pin, setPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setPin('');
  }

  async function handleLoginSubmit(event) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const currentUser = await loginWithPin({
        pin,
        nextPath: window.location.pathname
      });
      setUser(currentUser);
      setAuthState('signed_in');
      setPin('');
    } catch (loginError) {
      setError(loginError.message || 'PIN sign-in failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const hasRequiredRole = user && (requiredRole === 'employee'
    ? ['employee', 'manager'].includes(user.role)
    : user.role === 'manager');
  const hasRequiredAuthMethod = !requiredAuthMethod || user?.authMethod === requiredAuthMethod;

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
          {authMethod === 'pin' ? (
            <form style={styles.form} onSubmit={handleLoginSubmit}>
              <p style={styles.helperText}>
                Sign in with your unique 4-digit employee PIN.
              </p>
              <label style={styles.field}>
                <span style={styles.fieldLabel}>4-digit PIN</span>
                <input
                  style={styles.input}
                  type="password"
                  value={pin}
                  onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
                  inputMode="numeric"
                  pattern="\d{4}"
                  placeholder="1234"
                  autoComplete="current-password"
                  required
                />
              </label>
              {error ? <p style={styles.error}>{error}</p> : null}
              <button style={styles.button} type="submit" disabled={isSubmitting}>
                <span>{isSubmitting ? 'Signing In…' : 'Sign In With PIN'}</span>
              </button>
            </form>
          ) : (
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
                <span style={styles.buttonIcon} aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="20" height="20" role="img" focusable="false">
                    <path
                      fill="#EA4335"
                      d="M12 10.2v3.9h5.4c-.2 1.3-1.5 3.9-5.4 3.9-3.3 0-6-2.8-6-6.1s2.7-6.1 6-6.1c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3.1 14.7 2.2 12 2.2c-5.4 0-9.8 4.4-9.8 9.8s4.4 9.8 9.8 9.8c5.7 0 9.5-4 9.5-9.6 0-.6-.1-1.1-.2-1.6H12Z"
                    />
                    <path
                      fill="#4285F4"
                      d="M3.3 7.4 6.5 9.8C7.4 7.5 9.5 5.9 12 5.9c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3.1 14.7 2.2 12 2.2 8.2 2.2 4.9 4.4 3.3 7.4Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M12 21.8c2.6 0 4.8-.9 6.4-2.5l-3.1-2.4c-.8.5-1.9.9-3.3.9-3.8 0-5.2-2.6-5.4-3.8l-3.1 2.4c1.6 3.1 4.9 5.4 8.5 5.4Z"
                    />
                    <path
                      fill="#34A853"
                      d="M3.3 16.6 6.5 14.2c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2L3.3 7.8c-.7 1.3-1.1 2.8-1.1 4.4s.4 3.1 1.1 4.4Z"
                    />
                  </svg>
                </span>
                <span>Login with Google</span>
              </button>
            </div>
          )}
          <Link to="/" style={styles.link}>Back to portal</Link>
        </div>
      </div>
    );
  }

  if (!hasRequiredRole || !hasRequiredAuthMethod) {
    const fallbackAccessDeniedMessage = !hasRequiredRole
      ? `You are signed in as ${user.firstName} ${user.lastName} (${user.jobTitle}), but this page requires ${roleLabel(requiredRole)} access.`
      : `This page requires ${requiredAuthMethod} sign-in. Please sign out and sign in with ${requiredAuthMethod === 'google' ? 'Google OAuth' : 'your PIN'}.`;

    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <p style={styles.kicker}>Secured Staff Access</p>
          <h1 style={styles.title}>Access restricted</h1>
          <p style={styles.subtitle}>{accessDeniedMessage || fallbackAccessDeniedMessage}</p>
          <div style={styles.actions}>
            <button style={styles.button} type="button" onClick={handleLogout}>Sign out</button>
            <Link to="/" style={styles.link}>Return to portal</Link>
          </div>
        </div>
      </div>
    );
  }

  if (children) {
    return (
      <div>
        <div style={styles.sessionBar}>
          <div style={styles.sessionBarInner}>
            <div style={styles.sessionSummary}>
              <strong>{formatDisplayName(user)}</strong>
              <span>{user.jobTitle}</span>
              <span>{user.email}</span>
            </div>

            <div style={styles.sessionActions}>
              <Link to="/" style={styles.sessionLink}>Portal</Link>
              <button style={styles.sessionButton} type="button" onClick={handleLogout}>Sign out</button>
            </div>
          </div>
        </div>

        {children}
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div>
            <p style={styles.kicker}>Authenticated Staff View</p>
            <h1 style={styles.title}>{title}</h1>
            <p style={styles.subtitle}>{description}</p>
          </div>
          <div style={styles.userCard}>
            <strong>{formatDisplayName(user)}</strong>
            <span>{user.jobTitle}</span>
            <span>{user.email}</span>
          </div>
        </div>

        <div style={styles.panel}>
          <h2 style={styles.sectionTitle}>Access granted</h2>
          <p style={styles.panelText}>
            {authMethod === 'pin'
              ? 'PIN authentication is active for this section, with a server-issued staff session.'
              : 'Google OAuth is active for this section, with a server-issued staff session.'}
          </p>
        </div>

        <div style={styles.actions}>
          <button style={styles.button} type="button" onClick={handleLogout}>Sign out</button>
          <Link to="/" style={styles.link}>Return to portal</Link>
        </div>
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
  field: {
    display: 'grid',
    gap: '8px'
  },
  fieldLabel: {
    color: '#5a483d',
    fontWeight: 700
  },
  input: {
    padding: '14px 16px',
    borderRadius: '16px',
    border: '1px solid #d7c3b3',
    background: '#fff',
    color: '#342117',
    fontSize: '1rem'
  },
  sessionBar: {
    position: 'sticky',
    top: 0,
    zIndex: 20,
    padding: '12px 20px',
    background: 'rgba(47, 33, 27, 0.92)',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 10px 24px rgba(0, 0, 0, 0.14)'
  },
  sessionBarInner: {
    maxWidth: '1400px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    flexWrap: 'wrap'
  },
  sessionSummary: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
    color: '#fff4e8'
  },
  sessionActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap'
  },
  sessionLink: {
    color: '#ffe3cf',
    textDecoration: 'none',
    fontWeight: 700
  },
  sessionButton: {
    border: '1px solid rgba(255, 227, 207, 0.5)',
    borderRadius: '999px',
    padding: '10px 16px',
    background: '#fff4e8',
    color: '#4d2c1b',
    fontWeight: 700,
    cursor: 'pointer'
  },
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    border: 'none',
    borderRadius: '999px',
    padding: '12px 18px',
    background: '#8d5231',
    color: '#fff',
    fontWeight: 700,
    cursor: 'pointer'
  },
  buttonIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  buttonIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    borderRadius: '999px',
    background: '#ffffff'
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
