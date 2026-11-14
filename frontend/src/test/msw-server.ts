import { setupServer } from "msw/node";

/**
 * Shared MSW server. Starts with no handlers; each test registers what it
 * needs with `server.use(http.get(apiUrl("/api/…"), …))`.
 */
export const server = setupServer();

/** Absolute URL the API client will call (NEXT_PUBLIC_API_URL fallback). */
export function apiUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}${path}`;
}
