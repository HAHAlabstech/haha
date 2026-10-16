import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No NEXT_PUBLIC_* env is used anywhere. Runtime chain/contract
  // config is served by /api/config so images are env-agnostic.
  // Standalone output keeps the VPS image lean (no dev deps at runtime).
  output: "standalone",
  reactStrictMode: true,
};

export default nextConfig;
