import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { LOCALE_STORAGE_KEY } from "@/lib/i18n/config";
import { apiUrl, server } from "@/test/msw-server";

const user = {
  id: 1,
  name: "Test User",
  email: "test@example.com",
  email_verified_at: null,
  created_at: null,
  updated_at: null,
  roles: ["user"],
  permissions: [],
  avatar_url: null,
  locale: "en" as const,
};

describe("api client", () => {
  it("calls /api/v1 with JSON + credentials and returns the typed body", async () => {
    let seen: Request | undefined;
    server.use(
      http.get(apiUrl("/api/v1/user"), ({ request }) => {
        seen = request;
        return HttpResponse.json({ data: user });
      }),
    );

    const { data } = await api.GET("/user");

    expect(data?.data.email).toBe("test@example.com");
    expect(seen?.headers.get("accept")).toBe("application/json");
  });

  it("sends cookies (credentials: include) on every request", async () => {
    // MSW's Node interceptor rebuilds the Request and drops `credentials`, so
    // inspect the Request the client hands to fetch instead.
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ data: user }));

    await api.GET("/user");

    const request = fetchSpy.mock.calls[0]?.[0] as Request;
    expect(request.url).toBe(apiUrl("/api/v1/user"));
    expect(request.credentials).toBe("include");
  });

  it("sends the UI locale as Accept-Language", async () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, "ar");
    let language: string | null = null;
    server.use(
      http.get(apiUrl("/api/v1/user"), ({ request }) => {
        language = request.headers.get("accept-language");
        return HttpResponse.json({ data: user });
      }),
    );

    await api.GET("/user");

    expect(language).toBe("ar");
  });

  it("fetches the CSRF cookie once before writes and echoes it as X-XSRF-TOKEN", async () => {
    let csrfCalls = 0;
    const tokens: (string | null)[] = [];
    server.use(
      http.get(apiUrl("/sanctum/csrf-cookie"), () => {
        csrfCalls++;
        document.cookie = "XSRF-TOKEN=abc%3D123; path=/";
        return new HttpResponse(null, { status: 204 });
      }),
      http.post(apiUrl("/api/v1/auth/logout"), ({ request }) => {
        tokens.push(request.headers.get("x-xsrf-token"));
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await api.POST("/auth/logout");
    await api.POST("/auth/logout");

    expect(csrfCalls).toBe(1);
    expect(tokens).toEqual(["abc=123", "abc=123"]);
  });

  it("does not fetch the CSRF cookie for reads", async () => {
    server.use(
      http.get(apiUrl("/sanctum/csrf-cookie"), () => {
        throw new Error("should not be called");
      }),
      http.get(apiUrl("/api/v1/user"), () => HttpResponse.json({ data: user })),
    );

    await expect(api.GET("/user")).resolves.toBeDefined();
  });

  it("rejects a 422 with ApiError carrying status, code, message and field errors", async () => {
    document.cookie = "XSRF-TOKEN=t; path=/";
    server.use(
      http.post(apiUrl("/api/v1/auth/login"), () =>
        HttpResponse.json(
          {
            message: "These credentials do not match our records.",
            code: "validation_failed",
            errors: { email: ["These credentials do not match our records."] },
          },
          { status: 422 },
        ),
      ),
    );

    const error = await api
      .POST("/auth/login", { body: { email: "a@b.co", password: "x" } })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 422,
      code: "validation_failed",
      message: "These credentials do not match our records.",
      errors: { email: ["These credentials do not match our records."] },
    });
  });

  it("maps other API errors by code (e.g. 401 unauthenticated)", async () => {
    server.use(
      http.get(apiUrl("/api/v1/user"), () =>
        HttpResponse.json(
          { message: "You are not signed in.", code: "unauthenticated" },
          { status: 401 },
        ),
      ),
    );

    await expect(api.GET("/user")).rejects.toMatchObject({
      status: 401,
      code: "unauthenticated",
      message: "You are not signed in.",
    });
  });

  it("falls back to a generic code/message when the error body is not JSON", async () => {
    server.use(
      http.get(apiUrl("/api/v1/user"), () => new HttpResponse("<html>502</html>", { status: 502 })),
    );

    await expect(api.GET("/user")).rejects.toMatchObject({
      status: 502,
      code: "server_error",
      message: "Request failed",
    });
  });
});
