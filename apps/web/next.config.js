const path = require('path');

/** @type {import('next').NextConfig} */
const isGitHubPages = process.env.GITHUB_PAGES === 'true';

const nextConfig = {
  outputFileTracingRoot: path.join(__dirname, '../../'),
  env: {
    NEXT_PUBLIC_BASE_PATH: isGitHubPages ? '/precursor' : '',
  },
  ...(isGitHubPages
    ? {
      output: 'export',
      basePath: '/precursor',
      trailingSlash: true,
    }
    : {
      async rewrites() {
        return [
          {
            source: '/api/:path*',
            destination: 'http://localhost:3001/api/:path*',
          },
          {
            source: '/ws',
            destination: 'http://localhost:3001/ws',
          },
        ];
      },
    }),
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
