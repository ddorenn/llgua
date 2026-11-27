import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  poweredByHeader: false,
  // Lessons and tutor prompts are read from /content at runtime; ship them with the server functions.
  outputFileTracingIncludes: {
    "/lessons/[id]": ["./content/lessons/**/*.json"],
    "/learning": ["./content/lessons/**/*.json"],
    "/lessons": ["./content/lessons/**/*.json"],
    "/api/health/content": ["./content/lessons/**/*.json"],
    "/api/tutor": ["./content/lessons/**/*.json", "./content/ai/**/*"],
    "/api/tutor/task": ["./content/lessons/**/*.json", "./content/ai/**/*"],
  },
};

export default nextConfig;
