// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // supabase/functions is Deno code (URL imports, Deno globals); it has its own toolchain.
    ignores: ["dist/*", "supabase/functions/**"],
  },
  {
    // Store tests load a fresh module per test with jest.isolateModules + require().
    files: ["**/*.test.ts", "**/*.test.tsx", "jest.setup.ts"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
]);
