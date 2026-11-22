import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
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
