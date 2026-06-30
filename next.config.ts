import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Smaller production bundle for self-hosting (DigitalOcean, etc.)
  output: "standalone",
};

export default nextConfig;
