import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["roy-photobathic-nonmedicinally.ngrok-free.dev"],
  async rewrites() {
    return [
      {
        source: "/luyen-noi",
        destination: "/shadowing",
      },
      {
        source: "/luyen-shadowing",
        destination: "/shadowing",
      },
      {
        source: "/dien-tu",
        destination: "/blanks",
      },
      {
        source: "/dien-cho-trong",
        destination: "/blanks",
      },
      {
        source: "/phan-xa",
        destination: "/reflex",
      },
      {
        source: "/luyen-phan-xa",
        destination: "/reflex",
      },
      {
        source: "/kho-tu-vung",
        destination: "/explorer",
      },
      {
        source: "/kham-pha",
        destination: "/explorer",
      },
      {
        source: "/gioi-thieu",
        destination: "/about",
      },
    ];
  },
};

export default nextConfig;
