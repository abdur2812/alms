import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevent @react-pdf/renderer from being bundled server-side
  serverExternalPackages: ["@react-pdf/renderer"],
  // Pin Turbopack's root to this app so it always resolves `next` from
  // ./node_modules (avoids "Next.js package not found" panics).
  turbopack: { root: here },
};

export default nextConfig;
