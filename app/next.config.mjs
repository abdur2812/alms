/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevent @react-pdf/renderer from being bundled server-side
  serverExternalPackages: ["@react-pdf/renderer"],
  async rewrites() {
    const target = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

    return [
      {
        source: "/api/:path*",
        destination: `${target}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
