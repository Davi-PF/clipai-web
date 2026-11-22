import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.r2.dev',
      },
      {
        protocol: 'https',
        hostname: '**.r2.cloudflarestorage.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.clipai.com.br',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/verificar-email',
        destination: '/verify-email',
        permanent: false,
      },
      {
        source: '/redefinir-senha',
        destination: '/reset-password',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
