import type { components } from "./schema";

/** Stable error codes from the API envelope (backend docs/03-api.md). */
export type ApiErrorCode = components["schemas"]["ApiErrorCode"];

/**
 * Every failed API call rejects with this. `message` is already translated by
 * the backend (Accept-Language) and safe to show; branch on `code`, not on
 * `message` or `status`.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly errors?: Record<string, string[]>;

  constructor(
    status: number,
    message: string,
    code: ApiErrorCode,
    errors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.errors = errors;
  }
}

type ErrorBody = { message?: unknown; code?: unknown; errors?: unknown };

/** Builds an ApiError from a non-2xx response; tolerates non-JSON bodies (proxies, 502s). */
export async function apiErrorFromResponse(response: Response): Promise<ApiError> {
  const body = (await response
    .clone()
    .json()
    .catch(() => null)) as ErrorBody | null;

  const code =
    typeof body?.code === "string"
      ? (body.code as ApiErrorCode)
      : response.status >= 500
        ? "server_error"
        : "http_error";
  const message = typeof body?.message === "string" ? body.message : "Request failed";
  const errors =
    body?.errors && typeof body.errors === "object"
      ? (body.errors as Record<string, string[]>)
      : undefined;

  return new ApiError(response.status, message, code, errors);
}
