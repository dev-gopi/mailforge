import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
    {
        ignores: [
            "**/dist/**",
            "**/coverage/**",
            "**/node_modules/**",
        ],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ["examples/**/*.mjs", "scripts/**/*.mjs", "tests/**/*.mjs", ".agents/**/*.mjs", "*.mjs"],
        languageOptions: {
            globals: {
                Buffer: "readonly",
                console: "readonly",
                process: "readonly",
                URL: "readonly",
            },
        },
    },
    {
        files: ["**/*.ts"],
        rules: {
            "@typescript-eslint/consistent-type-imports": [
                "error",
                {
                    prefer: "type-imports",
                    fixStyle: "separate-type-imports",
                },
            ],
        },
    },
);
