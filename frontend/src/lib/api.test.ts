import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { ApiError, apiFetch } from "@/lib/api";
import { apiUrl, server } from "@/test/msw-server";

describe("apiFetch", () => {
  it("returns parsed JSON and sends credentials-friendly headers", async () => {
    let seen: Headers | undefined;
    server.use(
      http.get(apiUrl("/api/user"), ({ request }) => {
        seen = request.headers;
        return HttpResponse.json({ user: { id: 1 } });
      }),
    );

    await expect(apiFetch("/api/user")).resolves.toEqual({ user: { id: 1 } });
    expect(seen?.get("accept")).toBe("application/json");
  });

  it("fetches the CSRF cookie before a mutating request and echoes it as X-XSRF-TOKEN", async () => {
    let csrfCalls = 0;
    let xsrfHeader: string | null = null;
    server.use(
      http.get(apiUrl("/sanctum/csrf-cookie"), () => {
        csrfCalls++;
        document.cookie = "XSRF-TOKEN=abc%3D123; path=/";
        return new HttpResponse(null, { status: 204 });
      }),
      http.post(apiUrl("/api/logout"), ({ request }) => {
        xsrfHeader = request.headers.get("x-xsrf-token");
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await expect(apiFetch("/api/logout", { method: "POST" })).resolves.toBeUndefined();
    expect(csrfCalls).toBe(1);
    expect(xsrfHeader).toBe("abc=123");
  });

  it("maps a 422 to ApiError with status, message and field errors", async () => {
    document.cookie = "XSRF-TOKEN=t; path=/";
    server.use(
      http.post(apiUrl("/api/login"), () =>
        HttpResponse.json(
          { message: "These credentials do not match our records.", errors: { email: ["Nope."] } },
          { status: 422 },
        ),
      ),
    );

    const error = await apiFetch("/api/login", { method: "POST", body: "{}" }).catch(
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 422,
      message: "These credentials do not match our records.",
      errors: { email: ["Nope."] },
    });
  });

  it("uses a generic message when the error body is not JSON", async () => {
    server.use(
      http.get(apiUrl("/api/user"), () => new HttpResponse("<html>502</html>", { status: 502 })),
    );

    await expect(apiFetch("/api/user")).rejects.toMatchObject({
      status: 502,
      message: "Request failed",
    });
  });
});
