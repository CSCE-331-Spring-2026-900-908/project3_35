import jwt from 'jsonwebtoken';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured.');
  }
  return secret;
}

export function deriveRole(jobTitle) {
  return /manager/i.test(jobTitle || '') ? 'manager' : 'employee';
}

export function signAccessToken(employee) {
  const payload = {
    sub: String(employee.employeeId),
    employeeId: employee.employeeId,
    email: employee.email,
    firstName: employee.firstName,
    lastName: employee.lastName,
    jobTitle: employee.jobTitle,
    role: deriveRole(employee.jobTitle)
  };

  return jwt.sign(payload, getJwtSecret(), { expiresIn: '8h' });
}

export function authenticateRequest(request, response, next) {
  const authorizationHeader = request.headers.authorization || '';

  if (!authorizationHeader.startsWith('Bearer ')) {
    return response.status(401).json({ error: 'Authentication required.' });
  }

  const token = authorizationHeader.slice('Bearer '.length).trim();
  if (!token) {
    return response.status(401).json({ error: 'Authentication required.' });
  }

  try {
    request.auth = jwt.verify(token, getJwtSecret());
    return next();
  } catch (_error) {
    return response.status(401).json({ error: 'Invalid or expired token.' });
  }
}

export function requireRole(...allowedRoles) {
  return (request, response, next) => {
    if (!request.auth?.role) {
      return response.status(401).json({ error: 'Authentication required.' });
    }

    if (!allowedRoles.includes(request.auth.role)) {
      return response.status(403).json({ error: 'You do not have permission to access this resource.' });
    }

    return next();
  };
}
