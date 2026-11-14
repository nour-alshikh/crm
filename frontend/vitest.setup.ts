import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./src/test/msw-server";

// MSW intercepts fetch for every test. Unhandled requests fail loudly so a
// test never silently hits a real backend.
beforeAll(() => server.listen({ onUnhandledFrame: "error" })); // MSW 3 name (was onUnhandledRequest)

afterEach(() => {
  server.resetHandlers();
  cleanup();
  document.cookie.split("; ").forEach((cookie) => {
    const name = cookie.split("=")[0];
    if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  });
  window.localStorage.clear();
});

afterAll(() => server.close());
