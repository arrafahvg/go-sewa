/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Server Actions carry base64 file uploads; 50 MB files ~ 70 MB payload
    serverActions: { bodySizeLimit: '75mb' },
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
