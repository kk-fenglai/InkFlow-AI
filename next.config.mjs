/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["pdfjs-dist"],
  },
};

export default nextConfig;
