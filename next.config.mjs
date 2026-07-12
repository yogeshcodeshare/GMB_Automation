/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // .env.local uses unprefixed names (SUPABASE_URL etc.). The browser needs the
  // URL + publishable key (safe to expose by design); map them here so the
  // founder never has to edit .env.local. The SECRET key is never mapped.
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
