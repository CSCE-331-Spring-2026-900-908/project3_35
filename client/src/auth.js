import { apiUrl } from './apiBase';

const ACCESS_TOKEN_KEY = 'sharetea_access_token';
const USER_KEY = 'sharetea_user';
const POST_LOGIN_PATH_KEY = 'sharetea_post_login_path';

export function getStoredToken() {
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getStoredUser() {
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (_error) {
    return null;
  }
}

export function storeSession(accessToken, user) {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

export function storePostLoginPath(path) {
  if (!path) {
    window.sessionStorage.removeItem(POST_LOGIN_PATH_KEY);
    return;
  }

  window.sessionStorage.setItem(POST_LOGIN_PATH_KEY, path);
}

export function consumePostLoginPath() {
  const path = window.sessionStorage.getItem(POST_LOGIN_PATH_KEY);
  window.sessionStorage.removeItem(POST_LOGIN_PATH_KEY);
  return path || null;
}

export function buildAuthHeaders() {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function beginGoogleLogin(nextPath = '/') {
  storePostLoginPath(nextPath);
  window.location.assign(apiUrl('/api/auth/google/start'));
}

export async function loginWithPin({ pin, nextPath = '/' }) {
  const response = await fetch(apiUrl('/api/auth/login'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ pin })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.details || payload.error || 'PIN sign-in failed.');
  }

  if (!payload.accessToken || !payload.user) {
    throw new Error('PIN sign-in did not return a complete session.');
  }

  storeSession(payload.accessToken, payload.user);
  storePostLoginPath(nextPath);
  return payload.user;
}

export function completeGoogleLoginFromHash(hash = window.location.hash) {
  const params = new URLSearchParams(String(hash || '').replace(/^#/, ''));
  const error = params.get('error');

  if (error) {
    throw new Error(error);
  }

  const accessToken = params.get('accessToken');
  const encodedUser = params.get('user');
  if (!accessToken || !encodedUser) {
    throw new Error('Google sign-in did not return a complete session.');
  }

  const base64 = encodedUser.replace(/-/g, '+').replace(/_/g, '/');
  const padded = `${base64}${'='.repeat((4 - (base64.length % 4 || 4)) % 4)}`;
  const binary = window.atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  const user = JSON.parse(new TextDecoder().decode(bytes));
  storeSession(accessToken, user);
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
  return user;
}

export async function fetchCurrentUser() {
  const response = await fetch(apiUrl('/api/auth/me'), {
    headers: {
      ...buildAuthHeaders()
    }
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.details || payload.error || 'Session verification failed.');
  }

  storeSession(getStoredToken(), payload.user);
  return payload.user;
}
