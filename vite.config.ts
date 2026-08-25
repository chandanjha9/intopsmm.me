import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  nitro: {
    preset: "node-server",
    externals: [
      "msnodesqlv8",
      "msnodesqlv8/lib/util",
      "mssql/msnodesqlv8.js",
    ],
  },
  vite: {
    server: {
      port: 5173,
      strictPort: false,
    },
    resolve: {
      tsconfigPaths: true,
    },
  },
});
