import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      cli: "src/cli.ts",
      index: "src/index.ts",
      "emobar-hook": "src/hook.ts",
    },
    format: ["esm"],
    target: "node20",
    dts: { entry: "src/index.ts" },
    clean: true,
    splitting: false,
  },
]);
