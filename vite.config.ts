import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(async () => {
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    plugins: [
      react(),
      cloudflare({
        viteEnvironment: { name: "server" },
        config: {
          main: "./worker/index.ts",
          compatibility_date: "2026-07-24",
          assets: {
            binding: "ASSETS",
            not_found_handling: "single-page-application",
            run_worker_first: true,
          },
        },
      }),
    ],
    server: {
      host: "127.0.0.1",
      port: 4173,
    },
    preview: {
      host: "127.0.0.1",
      port: 4173,
    },
  };
});
