// Root ESLint config — what ESLint loads when linting this repo itself.
//
// ESLint v10 requires config files to export an array: function-export config
// files were dropped and fail every run with `TypeError: Unexpected function.`
// (that is exactly what the previous file, which exported the factory, did).
// The rules live in the factory `./eslint-preset.js`; this file only calls it.
//
// Consumers never import this file — the package export
// `@martinrun/frontend-config/eslint` points at `eslint-preset.js`, so their
// `export default config()` keeps working unchanged.
import tseslint from "typescript-eslint";
import globals from "globals";

import config from "./eslint-preset.js";

export default [
  ...config({
    // test/fixtures/** are deliberate rule-violation samples; the mandatory
    // `npm test` lints them through the fixture config (see
    // test/fixtures/eslint.config.js), so the repo-wide lint has to skip them.
    ignores: ["test/fixtures/**"],
  }),
  // The type-checked rules (strict, `no-unsafe-*`, `@typescript-eslint/*`)
  // need a resolvable app project, and this conventions repo is not one: its
  // src/ imports consumer-only packages (`@tanstack/react-query`, lucide-react,
  // `@/components/ui/button`) that are not installed here and are resolved in
  // *consuming* projects instead. The kit's type coverage lives in `npm test`,
  // which type-lints the test/fixtures through the fixture project, so the
  // repo-wide lint drops the type-aware parser for its own source.
  {
    files: ["src/**/*.{ts,tsx}"],
    ...tseslint.configs.disableTypeChecked,
  },
  // Node-run scripts and test harnesses are neither `*.config.js` (which the
  // preset's Node-glob covers) nor part of a tsconfig project — drop the
  // type-aware parser for them the same way the preset does for config files,
  // and hand them Node globals.
  {
    files: ["test/**/*.mjs", "scripts/**/*.mjs"],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      ...tseslint.configs.disableTypeChecked.languageOptions,
      globals: globals.node,
    },
  },
];
