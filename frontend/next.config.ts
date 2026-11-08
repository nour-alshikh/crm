import type { NextConfig } from "next";

// Proxy mode: when BACKEND_URL is set (e.g. on Vercel), the browser talks only
// to this Next.js origin and /api + /sanctum are forwarded to Laravel. Cookies
// then belong to the frontend's own domain, so Sanctum cookie auth works even
// when frontend and backend share no parent domain (e.g. *.vercel.app).
// See docs/deployment.md.
const backendUrl = process.env.BACKEND_URL?.replace(/\/+$/, "");

const nextConfig: NextConfig = {
  env: {
    // Empty string = same-origin requests (proxied). Otherwise call the API
    // directly, as in local dev.
    NEXT_PUBLIC_API_URL: backendUrl
      ? ""
      : (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"),
  },
  async rewrites() {
    if (!backendUrl) return [];

    return [
      { source: "/api/:path*", destination: `${backendUrl}/api/:path*` },
      { source: "/sanctum/:path*", destination: `${backendUrl}/sanctum/:path*` },
    ];
  },
};

export default nextConfig;
