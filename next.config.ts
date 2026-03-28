import type { NextConfig } from "next"

const config: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000"],
    },
  },
  webpack: (config) => {
    config.resolve.alias.canvas = false
    return config
  },
}

export default config
