import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Stray lockfiles above this folder (~ and "Codebase Projects") make Next
  // mis-infer the workspace root; pin it so Turbopack resolves from here.
  turbopack: {
    root: __dirname,
  },
  // The dev-only route indicator defaults to bottom-left, where it lands on top
  // of the sidebar's Settings row and makes it unreadable — which is what every
  // screenshot of the app taken off `next dev` shows. It is a Next.js overlay in
  // its own shadow root, not app chrome, so moving it is the whole fix; nothing
  // renders it in production either way.
  devIndicators: {
    position: 'bottom-right',
  },
};

export default nextConfig;
