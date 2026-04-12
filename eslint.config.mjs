import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const config = [
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    // Git worktrees share the same node_modules but should be linted
    // independently from their own directory, not from the main workspace.
    ignores: [".worktrees/**"],
  },
  {
    rules: {
      // Allow identifiers prefixed with _ to be unused.
      // This is the conventional way to mark intentionally-unused function
      // parameters (e.g. interface implementations where the param is required
      // by the contract but not needed in the concrete body).
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args: "all",
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
];

export default config;
