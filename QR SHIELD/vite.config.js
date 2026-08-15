import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import fs from "fs";
import path from "path";

const localKeyPath = path.resolve(__dirname, "localhost-key.pem");
const localCertPath = path.resolve(__dirname, "localhost.pem");
const hasLocalHttpsCert = fs.existsSync(localKeyPath) && fs.existsSync(localCertPath);

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: {
        enabled: true,
      },
      includeAssets: ["favicon.ico", "pwa-192x192.png", "pwa-512x512.png"],
      manifest: {
        id: "/",
        name: "QR Shield",
        short_name: "QR Shield",
        description: "Scan QR codes safely online or offline.",
        theme_color: "#eef2f6",
        background_color: "#eef2f6",
        display: "standalone",
        display_override: ["standalone", "minimal-ui"],
        start_url: "/",
        scope: "/",
        lang: "en",
        categories: ["utilities", "security", "productivity"],
        shortcuts: [
          {
            name: "Scan QR code",
            short_name: "Scan QR",
            description: "Open QR Shield scanner",
            url: "/?source=scan-shortcut",
            icons: [
              {
                src: "pwa-192x192.png",
                sizes: "192x192",
                type: "image/png",
              },
            ],
          },
        ],
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
  server: {
    host: true,
    port: 1024,
    https: hasLocalHttpsCert
      ? {
          key: fs.readFileSync(localKeyPath),
          cert: fs.readFileSync(localCertPath),
        }
      : undefined,
  },
});
