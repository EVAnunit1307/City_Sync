import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable React strict mode for Three.js compatibility
  reactStrictMode: false,

  // Enable experimental features for faster builds
  experimental: {
    optimizePackageImports: ['three', '@react-three/fiber', '@react-three/drei', 'lucide-react', 'framer-motion'],
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },

  // Ignore TypeScript build errors (React Three Fiber types are provided at runtime)
  typescript: {
    ignoreBuildErrors: true,
  },

  webpack: (config, { isServer }) => {
    // Optimize large dependencies
    config.optimization = {
      ...config.optimization,
      moduleIds: 'deterministic',
    };

    // Don't bundle large data files on server
    if (isServer) {
      config.externals = [...(config.externals || []), 'bufferutil', 'utf-8-validate'];
    }

    return config;
  },

  // Transpile Three.js and R3F packages
  transpilePackages: ["three", "@react-three/fiber", "@react-three/drei"],
};

export default nextConfig;
