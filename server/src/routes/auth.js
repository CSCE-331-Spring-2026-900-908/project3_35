import { Router } from 'express';
import { randomUUID } from 'crypto';
import { authenticateRequest, signAccessToken, verifyAccessToken } from '../auth.js';

function normalizeEmployee(row) {
  return {
    employeeId: row.employee_id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    jobTitle: row.job_title
  };
}

function cleanString(value) {
  return String(value ?? '').trim();
}

function normalizeEmail(value) {
  return cleanString(value).toLowerCase();
}

function isValidPin(value) {
  return /^\d{4}$/.test(String(value ?? ''));
}

function getGoogleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.');
  }

  return { clientId, clientSecret };
}

function getServerOrigin(request) {
  const forwardedProto = String(request.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const forwardedHost = String(request.headers['x-forwarded-host'] || '').split(',')[0].trim();
  const host = forwardedHost || request.get('host');
  const protocol = forwardedProto || request.protocol || 'http';
  return `${protocol}://${host}`;
}

function getGoogleRedirectUri(request) {
  return process.env.GOOGLE_REDIRECT_URI || `${getServerOrigin(request)}/api/auth/google/callback`;
}

function getClientOrigin() {
  return String(process.env.CLIENT_ORIGIN || 'http://localhost:5173').replace(/\/+$/, '');
}

function buildClientCallbackUrl() {
  return `${getClientOrigin()}/auth/callback`;
}

function encodeSessionRedirect({ accessToken, user, error }) {
  const params = new URLSearchParams();

  if (accessToken && user) {
    params.set('accessToken', accessToken);
    params.set('user', Buffer.from(JSON.stringify(user)).toString('base64url'));
  }

  if (error) {
    params.set('error', error);
  }

  return `${buildClientCallbackUrl()}#${params.toString()}`;
}

function signOAuthState() {
  return signAccessToken(
    {
      employeeId: 0,
      email: 'oauth-state@sharetea.local',
      firstName: 'OAuth',
      lastName: 'State',
      jobTitle: 'oauth-state'
    },
    {
      expiresIn: '10m',
      payload: {
        type: 'google-oauth-state',
        nonce: randomUUID()
      }
    }
  );
}

function verifyOAuthState(state) {
  const payload = verifyAccessToken(state);
  if (payload.type !== 'google-oauth-state') {
    throw new Error('Invalid Google OAuth state.');
  }
}

async function exchangeCodeForTokens({ code, request }) {
  const { clientId, clientSecret } = getGoogleConfig();
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getGoogleRedirectUri(request),
      grant_type: 'authorization_code'
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error_description || payload.error || 'Google token exchange failed.');
  }

  if (!payload.id_token) {
    throw new Error('Google did not return an ID token.');
  }

  return payload;
}

async function fetchGoogleProfile(idToken) {
  const { clientId } = getGoogleConfig();
  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error_description || payload.error || 'Google token verification failed.');
  }

  if (payload.aud !== clientId) {
    throw new Error('Google token audience does not match this application.');
  }

  if (payload.email_verified !== 'true') {
    throw new Error('Google account email is not verified.');
  }

  return {
    email: String(payload.email || '').trim().toLowerCase(),
    firstName: payload.given_name || '',
    lastName: payload.family_name || ''
  };
}

export function createAuthRouter(pool) {
  const router = Router();

  router.post('/login', async (request, response) => {
    if (!pool) {
      return response.status(503).json({
        error: 'Database is not configured.',
        details: 'Employee login requires a PostgreSQL connection.'
      });
    }

    const email = normalizeEmail(request.body?.email);
    const pin = cleanString(request.body?.pin);

    if (!email || !email.includes('@')) {
      return response.status(400).json({
        error: 'A valid email is required.'
      });
    }

    if (!isValidPin(pin)) {
      return response.status(400).json({
        error: 'PIN must be exactly 4 digits.'
      });
    }

    try {
      const result = await pool.query(
        `
          SELECT
            employee_id,
            email,
            first_name,
            last_name,
            job_title,
            password_hash
          FROM employee
          WHERE LOWER(email) = $1
          LIMIT 1
        `,
        [email]
      );

      if (result.rows.length === 0) {
        return response.status(401).json({
          error: 'Invalid email or PIN.'
        });
      }

      const employeeRow = result.rows[0];
      if (String(employeeRow.password_hash || '') !== pin) {
        return response.status(401).json({
          error: 'Invalid email or PIN.'
        });
      }

      const employee = normalizeEmployee(employeeRow);
      const user = {
        ...employee,
        role: /manager/i.test(employee.jobTitle) ? 'manager' : 'employee'
      };
      const accessToken = signAccessToken(employee);

      return response.json({ accessToken, user });
    } catch (error) {
      return response.status(500).json({
        error: 'Sign-in failed.',
        details: error.message
      });
    }
  });

  router.get('/google/start', (request, response) => {
    try {
      const { clientId } = getGoogleConfig();
      const authorizationUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');

      authorizationUrl.searchParams.set('client_id', clientId);
      authorizationUrl.searchParams.set('redirect_uri', getGoogleRedirectUri(request));
      authorizationUrl.searchParams.set('response_type', 'code');
      authorizationUrl.searchParams.set('scope', 'openid email profile');
      authorizationUrl.searchParams.set('prompt', 'select_account');
      authorizationUrl.searchParams.set('state', signOAuthState());

      return response.redirect(authorizationUrl.toString());
    } catch (error) {
      return response.redirect(encodeSessionRedirect({ error: error.message }));
    }
  });

  router.get('/google/callback', async (request, response) => {
    if (!pool) {
      return response.redirect(encodeSessionRedirect({
        error: 'Database is not configured. Employee login requires a PostgreSQL connection.'
      }));
    }

    const state = String(request.query?.state || '').trim();
    const code = String(request.query?.code || '').trim();
    const oauthError = String(request.query?.error || '').trim();

    if (oauthError) {
      return response.redirect(encodeSessionRedirect({
        error: `Google sign-in failed: ${oauthError.replace(/_/g, ' ')}.`
      }));
    }

    if (!state || !code) {
      return response.redirect(encodeSessionRedirect({
        error: 'Google sign-in response is missing the required state or code.'
      }));
    }

    try {
      verifyOAuthState(state);

      const tokenPayload = await exchangeCodeForTokens({ code, request });
      const googleProfile = await fetchGoogleProfile(tokenPayload.id_token);

      const result = await pool.query(
        `
          SELECT
            employee_id,
            email,
            first_name,
            last_name,
            job_title
          FROM employee
          WHERE LOWER(email) = $1
          LIMIT 1
        `,
        [googleProfile.email]
      );

      if (result.rows.length === 0) {
        return response.redirect(encodeSessionRedirect({
          error: 'Your Google account is not authorized for staff access.'
        }));
      }

      const employee = normalizeEmployee(result.rows[0]);
      const resolvedEmployee = {
        ...employee,
        firstName: employee.firstName || googleProfile.firstName,
        lastName: employee.lastName || googleProfile.lastName
      };
      const user = {
        ...resolvedEmployee,
        role: /manager/i.test(resolvedEmployee.jobTitle) ? 'manager' : 'employee'
      };
      const accessToken = signAccessToken(resolvedEmployee);

      return response.redirect(encodeSessionRedirect({ accessToken, user }));
    } catch (error) {
      return response.redirect(encodeSessionRedirect({
        error: error.message || 'Google sign-in failed.'
      }));
    }
  });

  router.get('/me', authenticateRequest, (request, response) => {
    return response.json({ user: request.auth });
  });

  return router;
}
