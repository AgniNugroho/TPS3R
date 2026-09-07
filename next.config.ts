import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    allowedDevOrigins: ["10.43.87.207", "10.164.110.207", "192.168.100.204", "192.168.18.24"],
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "*.supabase.co",
                pathname: "/**",
            },
            {
                protocol: "https",
                hostname: "atoafmqyqsksyhfxchnt.supabase.co",
                pathname: "/**",
            },
        ],
    },
};

export default nextConfig;
