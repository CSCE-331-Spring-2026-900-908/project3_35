import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { checkDatabase, createPool } from './db.js';
import { createAuthRouter } from './routes/auth.js';
import { createInventoryRouter } from './routes/inventory.js';
import { createMenuRouter } from './routes/menu.js';
import { createOrdersRouter } from './routes/orders.js';
import { createReportsRouter } from './routes/reports.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3001);
const pool = createPool();

app.use(cors());
app.use(express.json());

app.get('/api/health', async (_request, response) => {
  const dbReady = await checkDatabase(pool);
  response.json({
    service: 'sharetea-web-pos-server',
    status: 'ok',
    database: dbReady ? 'connected' : 'sample-data-mode'
  });
});

app.use('/api/auth', createAuthRouter(pool));
app.use('/api/inventory', createInventoryRouter(pool));
app.use('/api/menu', createMenuRouter(pool));
app.use('/api/orders', createOrdersRouter(pool));
app.use('/api/reports', createReportsRouter(pool));

app.listen(port, () => {
  console.log(`Sharetea API listening on port ${port}`);
});
