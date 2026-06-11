/** @type {import('next').NextConfig} */
import createMDX from "@next/mdx";

const withMDX = createMDX({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
});

const nextConfig = {
  images: {
    remotePatterns: [{ hostname: "images.ctfassets.net" }],
  },
  pageExtensions: ["js", "jsx", "ts", "tsx", "md", "mdx"],
  skipTrailingSlashRedirect: true,
  // The "Collecting build traces" step can wedge on a stuck io_uring wait in
  // some local environments, hanging `next build` indefinitely. The pre-commit
  // build sets DISABLE_BUILD_TRACE=1 to skip it — locally we only need the
  // compile + typecheck. Vercel never sets this flag, so production deploys
  // keep full output file tracing (required for serverless function bundling).
  ...(process.env.DISABLE_BUILD_TRACE ? { outputFileTracing: false } : {}),
};

export default withMDX(nextConfig);
