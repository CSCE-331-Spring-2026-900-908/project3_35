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

For **production** (e.g. Vercel), set **`VITE_API_BASE_URL`** to your deployed API origin (no trailing slash), e.g. `https://your-api.vercel.app`. The client prepends this to `/api/...` requests. Add it in the **frontend** project’s environment variables and redeploy. **`VITE_API_ORIGIN` does not affect production builds** (it only configures the dev proxy).

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
