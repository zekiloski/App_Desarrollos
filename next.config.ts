import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp", "exceljs"],
  poweredByHeader: false,
};

export default nextConfig;
