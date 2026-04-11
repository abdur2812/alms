/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevent @react-pdf/renderer from being bundled server-side
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
