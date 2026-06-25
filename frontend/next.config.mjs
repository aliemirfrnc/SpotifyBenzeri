import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  allowedDevOrigins: ["127.0.0.1"],
  async rewrites() {
    return [
      {
        source: '/api_proxy/:path*',
        destination: 'http://127.0.0.1:8000/:path*', // Proxy to Backend
      },
    ]
  },
};

export default nextConfig;
