/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    bundlePagesExternals: true,
    serverComponentsExternalPackages: ['pino', 'pino-pretty'],
  },
  images: {
    domains: ['cdn.example.com', 'images.example.com'],
  },
};

module.exports = nextConfig;
