import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    // Pin the local timezone so the midnight-boundary logic in splitByDay
    // (which uses Date#setHours, i.e. local time) is deterministic in CI
    // regardless of the host's configured timezone.
    env: { TZ: "UTC" },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
