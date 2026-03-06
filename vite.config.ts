import path from "node:path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import electron from "vite-plugin-electron/simple"

export default defineConfig({
  resolve: {
    alias: { "@": path.join(__dirname, "src") },
  },
  plugins: [
    react(),
    electron({
      main: {
        entry: "electron/main/index.ts",
        vite: {
          build: {
            outDir: "dist-electron/main",
          },
        },
      },
      preload: {
        input: "electron/preload/index.ts",
        vite: {
          build: {
            outDir: "dist-electron/preload",
          },
        },
      },
      renderer: {},
    }),
  ],
  clearScreen: false,
})
