import { base } from "./base.js"

/** Shared Node/library ESLint config for Villuh packages and the API server. */
export const nodeConfig = [
  ...base,
  {
    languageOptions: {
      globals: {
        process: "readonly",
        console: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        module: "readonly",
        require: "readonly",
        exports: "readonly",
      },
    },
  },
]

export default nodeConfig
