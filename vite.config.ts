import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // base: "./" keeps asset paths relative so the built site also works when
  // opened from a sub-path or a static file host without extra config.
  base: "./",
});
