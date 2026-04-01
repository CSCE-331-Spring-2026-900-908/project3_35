import { apiUrl } from './apiBase';

const ACCESS_TOKEN_KEY = 'sharetea_access_token';
const USER_KEY = 'sharetea_user';

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

export function buildAuthHeaders() {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function loginEmployee(credentials) {
  const response = await fetch(apiUrl('/api/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.details || payload.error || 'Login failed.');
  }

  storeSession(payload.accessToken, payload.user);
  return payload.user;
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
