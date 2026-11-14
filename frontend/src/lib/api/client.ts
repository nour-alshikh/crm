import createClient, { type Middleware } from "openapi-fetch";
import { LOCALE_STORAGE_KEY } from "@/lib/i18n/config";
import { apiErrorFromResponse } from "./errors";
import type { paths } from "./schema";

/**
 * Typed API client. Paths, params, bodies and responses all come from the
 * generated `schema.d.ts` (backend OpenAPI → `npm run api:types`); never
 * hand-write response types.
 *
 *   const { data } = await api.GET("/user");          // data: { data: UserResource }
 *   await api.POST("/auth/login", { body: values });
 *
 * Failed calls reject with ApiError (see ./errors), so callers use try/catch
 * or TanStack Query's `error` — no `{ data, error }` branching needed.
 *
 * NEXT_PUBLIC_API_URL is "" in proxy mode (same origin via Next rewrites).
 */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.split("; ").find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : null;
}

/** Sanctum SPA auth: make sure the XSRF-TOKEN cookie exists before a write. */
async function ensureCsrfCookie(): Promise<string | null> {
  if (!readCookie("XSRF-TOKEN")) {
    await fetch(`${API_URL}/sanctum/csrf-cookie`, { credentials: "include" });
  }
  return readCookie("XSRF-TOKEN");
}

const sanctum: Middleware = {
  async onRequest({ request }) {
    request.headers.set("Accept", "application/json");

    const locale =
      typeof window !== "undefined" ? window.localStorage.getItem(LOCALE_STORAGE_KEY) : null;
    if (locale) request.headers.set("Accept-Language", locale);

    if (MUTATING.has(request.method)) {
      const token = await ensureCsrfCookie();
      if (token) request.headers.set("X-XSRF-TOKEN", token);
    }

    return request;
  },
  async onResponse({ response }) {
    if (!response.ok) throw await apiErrorFromResponse(response);
    return response;
  },
};

export const api = createClient<paths>({
  baseUrl: `${API_URL}/api/v1`,
  credentials: "include",
  // Resolve fetch per call: openapi-fetch otherwise captures globalThis.fetch
  // at import time, so anything that patches fetch later (MSW in tests,
  // instrumentation) would be silently bypassed.
  fetch: (request) => globalThis.fetch(request),
});

api.use(sanctum);
