import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Quieter terminal in `bun dev` (fetch + request logs).
  logging: false,
  // Strip client console noise from production bundles (`bun run build` / `bun start`).
  compiler: isProduction
    ? {
        removeConsole: {
          exclude: ["error", "warn"],
        },
      }
    : undefined,
  serverExternalPackages: [
    "pdf-parse",
    "@napi-rs/canvas",
    "mammoth",
    "word-extractor",
    "xlsx",
  ],
};

export default nextConfig;
