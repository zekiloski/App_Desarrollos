import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp", "exceljs"],
  poweredByHeader: false,
  // El indicador de desarrollo va a la derecha para no tapar el pie del menú lateral.
  devIndicators: { position: "bottom-right" },
};

export default nextConfig;
