import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      { // Added for potential future use with Google Avatars or similar
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      }
    ],
    // Allow data URIs for AI generated selfies
    dangerouslyAllowSVG: true, // if SVGs are used in data URIs
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;", // Example, adjust as needed
    unoptimized: false, // Keep true unless specific issues with data URIs arise and are understood
    domains: ['placehold.co', 'lh3.googleusercontent.com'], // For Next 12 or older, or if remotePatterns not fully respected by some internal logic
    // For data URI support with next/image, it's usually handled by default for <img> tags
    // If using next/image with data URIs, ensure the base64 string is correctly formatted.
    // No specific 'loader' config needed for data URIs themselves but ensure they are large enough if unoptimized.
  },
};

export default nextConfig;
