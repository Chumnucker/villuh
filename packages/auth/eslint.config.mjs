import baseConfig from "@villuh/eslint-config/base"
import reactHooks from "eslint-plugin-react-hooks"

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...baseConfig,
  {
    plugins: { "react-hooks": reactHooks },
    // Classic hooks rules only — matches packages/ui. The v7 "recommended"
    // preset adds React Compiler rules that need a dedicated adoption pass.
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
]
