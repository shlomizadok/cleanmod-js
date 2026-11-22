import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/perspective.ts"],
  // perspective.ts has only a default export: make require() return it
  // directly, like `perspective-api-client` (module.exports = Perspective).
  cjsInterop: true,
  format: ["cjs", "esm"],
  dts: true,
  // Needed for cjsInterop to rewrite the CJS default export.
  splitting: true,
  sourcemap: true,
  clean: true,
  outDir: "dist",
  outExtension({ format }) {
    return {
      js: format === "cjs" ? ".cjs" : ".mjs",
    };
  },
});
