import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";


export default defineConfig(({ mode }) => ({
  server: {
    host: "127.0.0.1",
    port: parseInt(process.env.PORT || "5173"),
    middlewareMode: false,
    allowedHosts: true,
    hmr: {
      host: "localhost",
      port: 5173,
    },
  },
  build: {
    outDir: "dist",
    sourcemap: mode === "development",
    minify: mode === "production" ? "terser" : false,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor": [
            "react",
            "react-dom",
            "react-router-dom",
          ],
          "ui": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
          ],
        },
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./frontend/src"),
    },
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@supabase/supabase-js",
    ],
    exclude: ["@loadable/component"],
  },
}));
