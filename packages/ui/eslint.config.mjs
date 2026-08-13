import baseConfig from "@villuh/eslint-config/base"
import reactHooks from "eslint-plugin-react-hooks"

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...baseConfig,
  {
    plugins: { "react-hooks": reactHooks },
    // Classic hooks rules only — the v7 "recommended" preset adds React
    // Compiler rules (set-state-in-effect, refs, etc.) that flag patterns
    // used throughout this library; adopt those in a dedicated pass.
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
]
