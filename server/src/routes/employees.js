import { Router } from 'express';
import { authenticateRequest, requireRole } from '../auth.js';

const EMPLOYEE_COLUMNS = `
  employee_id,
  job_title,
  first_name,
  last_name,
  schedule,
  payment_info,
  start_date,
  hourly_pay,
  benefits,
  email
`;

function normalizeEmployee(row) {
  return {
    employee_id: row.employee_id,
    job_title: row.job_title,
    first_name: row.first_name,
    last_name: row.last_name,
    schedule: row.schedule,
    payment_info: row.payment_info,
    start_date: row.start_date,
    hourly_pay: row.hourly_pay,
    benefits: row.benefits,
    email: row.email
  };
}

function cleanString(value) {
  return String(value ?? '').trim();
}

function normalizeEmail(value) {
  return cleanString(value).toLowerCase();
}

function normalizeOptionalString(value) {
  const cleaned = cleanString(value);
  return cleaned ? cleaned : null;
}

function isValidPin(value) {
  return /^\d{4}$/.test(String(value ?? ''));
}

function validateEmployeePayload(payload) {
  const employee = {
    jobTitle: cleanString(payload.jobTitle),
    firstName: cleanString(payload.firstName),
    lastName: cleanString(payload.lastName),
    schedule: cleanString(payload.schedule),
    paymentInfo: cleanString(payload.paymentInfo),
    startDate: cleanString(payload.startDate),
    hourlyPay: Number(payload.hourlyPay),
    benefits: cleanString(payload.benefits),
    email: normalizeEmail(payload.email)
  };

  if (!employee.jobTitle) {
    return { error: 'Job title is required.' };
  }

  if (!employee.firstName) {
    return { error: 'First name is required.' };
  }

  if (!employee.lastName) {
    return { error: 'Last name is required.' };
  }

  if (!employee.schedule) {
    return { error: 'Schedule is required.' };
  }

  if (!employee.paymentInfo) {
    return { error: 'Payment info is required.' };
  }

  if (!employee.startDate) {
    return { error: 'Start date is required.' };
  }

  if (!Number.isFinite(employee.hourlyPay) || employee.hourlyPay < 0) {
    return { error: 'Hourly pay must be a valid non-negative number.' };
  }

  if (!employee.benefits) {
    return { error: 'Benefits is required. Use "None" if needed.' };
  }

  if (!employee.email || !employee.email.includes('@')) {
    return { error: 'A valid staff email is required.' };
  }

  if (!isValidPin(payload.pin)) {
    return { error: 'A 4-digit PIN is required.' };
  }

  return {
    employee: {
      ...employee,
      hourlyPay: employee.hourlyPay.toFixed(2),
      pin: cleanString(payload.pin)
    }
  };
}

function parseEmployeeId(value) {
  const employeeId = Number(value);
  if (!Number.isInteger(employeeId) || employeeId <= 0) {
    return { error: 'A valid employee ID is required.' };
  }
  return { employeeId };
}

function validateHourlyPayPayload(payload) {
  const hourlyPay = Number(payload.hourlyPay);
  if (!Number.isFinite(hourlyPay) || hourlyPay < 0) {
    return { error: 'Hourly pay must be a valid non-negative number.' };
  }
  return { hourlyPay: hourlyPay.toFixed(2) };
}

function validateEmployeeUpdatePayload(payload) {
  const employee = {
    jobTitle: cleanString(payload.jobTitle),
    firstName: cleanString(payload.firstName),
    lastName: cleanString(payload.lastName),
    schedule: cleanString(payload.schedule),
    paymentInfo: cleanString(payload.paymentInfo),
    startDate: cleanString(payload.startDate),
    hourlyPay: Number(payload.hourlyPay),
    benefits: cleanString(payload.benefits),
    email: normalizeEmail(payload.email)
  };

  if (!employee.jobTitle) return { error: 'Job title is required.' };
  if (!employee.firstName) return { error: 'First name is required.' };
  if (!employee.lastName) return { error: 'Last name is required.' };
  if (!employee.schedule) return { error: 'Schedule is required.' };
  if (!employee.paymentInfo) return { error: 'Payment info is required.' };
  if (!employee.startDate) return { error: 'Start date is required.' };
  if (!Number.isFinite(employee.hourlyPay) || employee.hourlyPay < 0) {
    return { error: 'Hourly pay must be a valid non-negative number.' };
  }
  if (!employee.benefits) return { error: 'Benefits is required. Use "None" if needed.' };
  if (!employee.email || !employee.email.includes('@')) {
    return { error: 'A valid staff email is required.' };
  }

  return {
    employee: {
      ...employee,
      hourlyPay: employee.hourlyPay.toFixed(2)
    }
  };
}

export function createEmployeesRouter(pool) {
  const router = Router();

  router.use(authenticateRequest, requireRole('manager'));

  router.get('/', async (_request, response) => {
    if (!pool) {
      return response.status(503).json({
        error: 'Database is not configured.',
        details: 'Set the PostgreSQL environment variables in server/.env and restart the server.'
      });
    }

    try {
      const result = await pool.query(
        `
          SELECT ${EMPLOYEE_COLUMNS}
          FROM employee
          ORDER BY employee_id
        `
      );

      return response.json({
        count: result.rows.length,
        items: result.rows.map(normalizeEmployee)
      });
    } catch (error) {
      return response.status(500).json({
        error: 'Failed to load employees.',
        details: error.message
      });
    }
  });

  router.post('/', async (request, response) => {
    if (!pool) {
      return response.status(503).json({
        error: 'Database is not configured.',
        details: 'Set the PostgreSQL environment variables in server/.env and restart the server.'
      });
    }

    const { employee, error } = validateEmployeePayload(request.body || {});
    if (error) {
      return response.status(400).json({ error });
    }

    try {
      const duplicateResult = await pool.query(
        `
          SELECT employee_id
          FROM employee
          WHERE LOWER(email) = $1
          LIMIT 1
        `,
        [employee.email]
      );

      if (duplicateResult.rows.length > 0) {
        return response.status(409).json({
          error: 'That email is already assigned to an employee account.'
        });
      }

      const result = await pool.query(
        `
          INSERT INTO employee (
            job_title,
            first_name,
            last_name,
            schedule,
            payment_info,
            start_date,
            hourly_pay,
            benefits,
            email,
            password_hash
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING ${EMPLOYEE_COLUMNS}
        `,
        [
          employee.jobTitle,
          employee.firstName,
          employee.lastName,
          employee.schedule,
          employee.paymentInfo,
          employee.startDate,
          employee.hourlyPay,
          employee.benefits,
          employee.email,
          employee.pin
        ]
      );

      return response.status(201).json({
        item: normalizeEmployee(result.rows[0])
      });
    } catch (error) {
      return response.status(500).json({
        error: 'Failed to create employee.',
        details: error.message
      });
    }
  });

  router.patch('/:employeeId/hourly-pay', async (request, response) => {
    if (!pool) {
      return response.status(503).json({
        error: 'Database is not configured.',
        details: 'Set the PostgreSQL environment variables in server/.env and restart the server.'
      });
    }

    const idPayload = parseEmployeeId(request.params.employeeId);
    if (idPayload.error) {
      return response.status(400).json({ error: idPayload.error });
    }

    const payPayload = validateHourlyPayPayload(request.body || {});
    if (payPayload.error) {
      return response.status(400).json({ error: payPayload.error });
    }

    try {
      const result = await pool.query(
        `
          UPDATE employee
          SET hourly_pay = $1
          WHERE employee_id = $2
          RETURNING ${EMPLOYEE_COLUMNS}
        `,
        [payPayload.hourlyPay, idPayload.employeeId]
      );

      if (result.rows.length === 0) {
        return response.status(404).json({ error: 'Employee not found.' });
      }

      return response.json({ item: normalizeEmployee(result.rows[0]) });
    } catch (error) {
      return response.status(500).json({
        error: 'Failed to update hourly pay.',
        details: error.message
      });
    }
  });

  router.patch('/:employeeId', async (request, response) => {
    if (!pool) {
      return response.status(503).json({
        error: 'Database is not configured.',
        details: 'Set the PostgreSQL environment variables in server/.env and restart the server.'
      });
    }

    const idPayload = parseEmployeeId(request.params.employeeId);
    if (idPayload.error) {
      return response.status(400).json({ error: idPayload.error });
    }

    const { employee, error } = validateEmployeeUpdatePayload(request.body || {});
    if (error) {
      return response.status(400).json({ error });
    }

    try {
      const duplicateResult = await pool.query(
        `
          SELECT employee_id
          FROM employee
          WHERE LOWER(email) = $1 AND employee_id <> $2
          LIMIT 1
        `,
        [employee.email, idPayload.employeeId]
      );

      if (duplicateResult.rows.length > 0) {
        return response.status(409).json({
          error: 'That email is already assigned to another employee account.'
        });
      }

      const result = await pool.query(
        `
          UPDATE employee
          SET
            job_title = $1,
            first_name = $2,
            last_name = $3,
            schedule = $4,
            payment_info = $5,
            start_date = $6,
            hourly_pay = $7,
            benefits = $8,
            email = $9
          WHERE employee_id = $10
          RETURNING ${EMPLOYEE_COLUMNS}
        `,
        [
          employee.jobTitle,
          employee.firstName,
          employee.lastName,
          employee.schedule,
          employee.paymentInfo,
          employee.startDate,
          employee.hourlyPay,
          employee.benefits,
          employee.email,
          idPayload.employeeId
        ]
      );

      if (result.rows.length === 0) {
        return response.status(404).json({ error: 'Employee not found.' });
      }

      return response.json({
        item: normalizeEmployee(result.rows[0])
      });
    } catch (error) {
      return response.status(500).json({
        error: 'Failed to update employee details.',
        details: error.message
      });
    }
  });

  router.post('/:employeeId/terminate', async (request, response) => {
    if (!pool) {
      return response.status(503).json({
        error: 'Database is not configured.',
        details: 'Set the PostgreSQL environment variables in server/.env and restart the server.'
      });
    }

    const idPayload = parseEmployeeId(request.params.employeeId);
    if (idPayload.error) {
      return response.status(400).json({ error: idPayload.error });
    }

    try {
      const result = await pool.query(
        `
          UPDATE employee
          SET
            job_title = 'Terminated',
            schedule = 'Inactive',
            benefits = 'Terminated',
            password_hash = $1
          WHERE employee_id = $2
          RETURNING ${EMPLOYEE_COLUMNS}
        `,
        [`terminated-${Date.now()}`, idPayload.employeeId]
      );

      if (result.rows.length === 0) {
        return response.status(404).json({ error: 'Employee not found.' });
      }

      return response.json({
        item: normalizeEmployee(result.rows[0])
      });
    } catch (error) {
      return response.status(500).json({
        error: 'Failed to terminate employee.',
        details: error.message
      });
    }
  });

  return router;
}
