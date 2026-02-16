import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => ({
  server: {
    host: "127.0.0.1",
    port: parseInt(process.env.PORT || "5173"),
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
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "src") },
      { find: "@/integrations/supabase/client", replacement: path.resolve(__dirname, "src/integrations/supabase/client.ts") },
      { find: "@/integrations/supabase/types", replacement: path.resolve(__dirname, "src/integrations/supabase/types.ts") }
    ],
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json']
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