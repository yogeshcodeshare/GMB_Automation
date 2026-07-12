import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
  },
  resolve: {
    alias: {
      "@/lib": path.resolve(__dirname, "src/lib"),
      "@/server": path.resolve(__dirname, "src/server"),
      "@/types": path.resolve(__dirname, "src/types"),
      "@/components": path.resolve(__dirname, "components"),
      "@/app": path.resolve(__dirname, "app"),
    },
  },
});
