import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { authenticateRequest, signAccessToken } from '../auth.js';

function normalizeEmployee(row) {
  return {
    employeeId: row.employee_id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    jobTitle: row.job_title
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

    const email = String(request.body?.email || '').trim().toLowerCase();
    const password = String(request.body?.password || '');

    if (!email || !password) {
      return response.status(400).json({ error: 'Email and password are required.' });
    }

    try {
      const result = await pool.query(
        `
          SELECT
            employee_id,
            email,
            password_hash,
            first_name,
            last_name,
            job_title
          FROM employee
          WHERE LOWER(email) = $1
          LIMIT 1
        `,
        [email]
      );

      if (result.rows.length === 0) {
        return response.status(401).json({ error: 'Invalid email or password.' });
      }

      const employeeRow = result.rows[0];
      if (!employeeRow.password_hash) {
        return response.status(401).json({ error: 'This employee account does not have a password set.' });
      }

      const matches = await bcrypt.compare(password, employeeRow.password_hash);
      if (!matches) {
        return response.status(401).json({ error: 'Invalid email or password.' });
      }

      const employee = normalizeEmployee(employeeRow);
      const accessToken = signAccessToken(employee);

      return response.json({
        accessToken,
        user: {
          ...employee,
          role: /manager/i.test(employee.jobTitle) ? 'manager' : 'employee'
        }
      });
    } catch (error) {
      return response.status(500).json({
        error: 'Login failed.',
        details: error.message
      });
    }
  });

  router.get('/me', authenticateRequest, (request, response) => {
    return response.json({ user: request.auth });
  });

  return router;
}
