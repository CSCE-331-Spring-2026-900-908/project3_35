import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { checkDatabase, createPool } from './db.js';
import { createInventoryRouter } from './routes/inventory.js';
import { createMenuRouter } from './routes/menu.js';
import { createOrdersRouter } from './routes/orders.js';
import { createTranslateRouter } from './routes/translate.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3001);
const pool = createPool();

app.use(cors());
app.use(express.json());

app.get('/api/health', async (_request, response) => {
  const dbReady = await checkDatabase(pool);
  response.json({
    service: 'moonwake-web-pos-server',
    status: 'ok',
    database: dbReady ? 'connected' : 'sample-data-mode'
  });
});

app.use('/api/inventory', createInventoryRouter(pool));
app.use('/api/menu', createMenuRouter(pool));
app.use('/api/orders', createOrdersRouter(pool));
app.use('/api/translate', createTranslateRouter());

app.listen(port, () => {
  console.log(`Moonwake API listening on port ${port}`);
});