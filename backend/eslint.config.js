// eslint.config.js or .eslintrc.config.js (Flat Config)
import vitest from "eslint-plugin-vitest";

export default [

  {
    // GLOBAL SETTINGS
    files: ["**/*.js"],

    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",

      globals: {
        ...vitest.environments.env.globals,   // Vitest globals: test, expect, describe, vi
        process: "readonly",
        console: "readonly",
        module: "readonly",
        URL: "readonly",
      },
    },

    plugins: {
      vitest,
    },

    rules: {
      "no-unused-vars": "warn",
      "no-undef": "off",               // FIXES: process, console, URL errors
      "no-console": "off",
      "vitest/no-focused-tests": "error",
    },
  },

  // TESTS CONFIG
  {
    files: ["tests/**/*.js"],
    rules: {
      "vitest/no-disabled-tests": "warn",
    },
  }
];
