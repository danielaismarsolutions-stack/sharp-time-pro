import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core (always needed)
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // Charts — only loaded on /reports and /dashboard
          "vendor-recharts": ["recharts"],
          // Animations — loaded by pages that use motion
          "vendor-framer": ["framer-motion"],
          // Drag & drop — only /calendar and /services
          "vendor-dnd": ["@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/utilities"],
          // Supabase SDK
          "vendor-supabase": ["@supabase/supabase-js"],
          // Date utilities
          "vendor-date-fns": ["date-fns"],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
}));
