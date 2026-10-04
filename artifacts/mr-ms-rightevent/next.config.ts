import type { NextConfig } from "next";

const configuredBasePath = process.env.BASE_PATH ?? "/mr-ms-rightevent/";
const basePath = configuredBasePath.replace(/\/+$/, "");

if (!basePath.startsWith("/")) {
  throw new Error(`BASE_PATH must start with "/"; received "${configuredBasePath}"`);
}

const nextConfig: NextConfig = {
  basePath,
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;