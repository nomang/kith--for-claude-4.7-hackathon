import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  serverExternalPackages: ['@anthropic-ai/sdk', 'openai', '@google/genai'],
  instrumentationHook: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
    ],
  },
  // Force Next.js to use this directory as the project root,
  // not the parent directory where it detects another package-lock.json.
  outputFileTracingRoot: path.resolve(__dirname),
};

export default nextConfig;
