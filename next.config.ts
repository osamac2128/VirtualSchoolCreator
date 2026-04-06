import type { NextConfig } from 'next'

const securityHeaders = [
  // Prevent MIME-type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Block clickjacking via iframes
  { key: 'X-Frame-Options', value: 'DENY' },
  // Enable XSS auditor in older browsers
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  // Referrer policy — don't leak origin on cross-origin requests
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Permissions policy — disable unnecessary browser features
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()',
  },
  // HTTP Strict Transport Security (2 years)
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  // Content Security Policy
  // Adjust 'connect-src' to include Supabase / OpenRouter as needed in production
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Next.js inline scripts + Supabase SDK
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      // Tailwind / shadcn inline styles
      "style-src 'self' 'unsafe-inline'",
      // Fonts & images — allow data: URIs for base64 images
      "img-src 'self' data: blob:",
      "font-src 'self'",
      // API calls: Supabase, OpenRouter
      "connect-src 'self' https://*.supabase.co https://openrouter.ai https://api.inngest.com",
      // No frame embedding
      "frame-src 'none'",
      "object-src 'none'",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
