import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;

function sslConfig() {
  if (process.env.DB_SSL === 'false') {
    return false;
  }
  return { rejectUnauthorized: false };
}

export function createPool() {
  if (!process.env.DB_PASSWORD) {
    return null;
  }

  return new Pool({
    host: process.env.DB_HOST || 'csce-315-db.engr.tamu.edu',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'team_35_db',
    user: process.env.DB_USER || 'team_35',
    password: process.env.DB_PASSWORD,
    ssl: sslConfig()
  });
}

export async function checkDatabase(pool) {
  if (!pool) {
    return false;
  }

  try {
    await pool.query('SELECT 1');
    return true;
  } catch (error) {
    return false;
  }
}
