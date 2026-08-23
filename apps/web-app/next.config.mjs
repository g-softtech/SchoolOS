/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@saas/ui"],
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
