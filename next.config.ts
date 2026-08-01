import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  reactCompiler: true,
  logging: false,
  experimental: {
    proxyClientMaxBodySize: "50mb",
  },
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
