# Sharetea Web POS

Full-stack point-of-sale web app: **React + Vite** client and **Express** API with optional **PostgreSQL**.

## Repository layout

- **`client/`** — React frontend (Vite)
- **`server/`** — REST API (`/api/...`)

## Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- For a live database: PostgreSQL reachable with credentials you put in `server/.env` (the API can still run without `DB_PASSWORD`; health check reports sample/offline DB mode)

## Quick start

### 1. Start the API

```bash
cd server
npm install
```

Create **`server/.env`** (see [Server environment variables](#server-environment-variables)). Then:

```bash
npm run dev
```

By default the API listens on **port 3001** (change with `PORT` in `server/.env`).

### 2. Start the client

```bash
cd client
npm install
```

Copy the example env file and adjust if your API is not on the default host/port:

- **Windows (PowerShell):** `Copy-Item .env.example .env`
- **macOS / Linux:** `cp .env.example .env`

Set **`VITE_API_ORIGIN`** in **`client/.env`** to the API base URL (must match `PORT`, e.g. `http://localhost:3001`). If you omit it, the Vite config defaults to `http://localhost:3001`.

```bash
npm run dev
```

The Vite dev server (default **http://localhost:5173**) proxies **`/api`** to **`VITE_API_ORIGIN`**, so relative API paths work locally.

For production on Vercel, see [Deploying to Vercel](#deploying-to-vercel).

## Deploying to Vercel

Use **two Vercel projects** if the API and UI are separate deployments (common when the API has its own repo or root directory): one for the **Express API** and one for the **Vite client**.

### Backend (API)

1. Create a project whose **root directory** is **`server/`** (or deploy only the server folder).
2. Set **`server/.env`** variables in the Vercel project settings (e.g. `PORT` is usually provided by the platform; set `DB_*` if you use PostgreSQL).
3. After deploy, note the public URL, e.g. **`https://your-api.vercel.app`**.

### Frontend (static client)

1. Create a project whose **root directory** is **`client/`**.
2. **Build:** `npm run build` (default output: **`dist/`**).
3. In the **frontend** project → **Settings → Environment variables**, add:
   - **`VITE_API_BASE_URL`** = your API origin with **no trailing slash**, e.g. `https://your-api.vercel.app`.
4. Redeploy so the build embeds `VITE_API_BASE_URL`. **`VITE_API_ORIGIN` is ignored in production**; it only configures the local dev proxy in `vite.config.js`.
5. Do **not** set `VITE_API_BASE_URL` in **`client/.env`** for everyday local dev (leave it unset so `/api` still goes through the Vite proxy). You can set it temporarily to test a production-like build with `npm run preview`.

The client resolves API calls with `apiUrl()` in **`client/src/apiBase.js`**: empty base in dev → relative `/api/...`; with `VITE_API_BASE_URL` → full URL to your API (avoids 404s when the static site and API live on different hosts).

### Client-side routes (e.g. `/customer`)

**`client/vercel.json`** rewrites unknown paths to **`index.html`** so React Router routes work on refresh and direct links. Without this, paths like `/customer` can return **404** from the static host.

## Environment variables

### Client (`client/.env`)

| Variable | Description |
| --- | --- |
| `VITE_API_ORIGIN` | API base URL used by the **Vite dev proxy** (`/api` → this origin). Example: `http://localhost:3001`. |
| `VITE_API_BASE_URL` | **Production:** full origin of the deployed API (no trailing slash). Example: `https://your-api.vercel.app`. Leave unset locally so requests use the dev proxy. |

Template: **`client/.env.example`**.

### Server (`server/.env`)

| Variable | Description |
| --- | --- |
| `PORT` | API listen port (default: `3001`) |
| `DB_HOST` | PostgreSQL host |
| `DB_PORT` | PostgreSQL port (default: `5432`) |
| `DB_NAME` | Database name |
| `DB_USER` | Database user |
| `DB_PASSWORD` | If unset, the server runs without a DB pool (health endpoint still works) |
| `DB_SSL` | Set to `false` to turn off SSL for Postgres |
| `DEFAULT_EMPLOYEE_ID` | Fallback employee id for orders (default: `1`) |

## NPM scripts

**Client** (`client/`)

| Script | Command |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build locally |

**Server** (`server/`)

| Script | Command |
| --- | --- |
| `npm run dev` | Run API with file watch |
| `npm start` | Run API (no watch) |
