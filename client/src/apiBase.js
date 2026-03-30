/**
 * Production builds must set VITE_API_BASE_URL to the deployed API origin (no trailing slash),
 * e.g. https://your-api.vercel.app — otherwise requests stay same-origin and 404 on static hosting.
 * Leave unset for local dev; Vite proxies /api to VITE_API_ORIGIN.
 */
export function apiUrl(path) {
  const raw = import.meta.env.VITE_API_BASE_URL ?? '';
  const base = String(raw).trim().replace(/\/+$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  if (!base) {
    return p;
  }
  return `${base}${p}`;
}
