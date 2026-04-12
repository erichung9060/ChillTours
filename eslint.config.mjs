import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default [
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    // Git worktrees share the same node_modules but should be linted
    // independently from their own directory, not from the main workspace.
    ignores: [".worktrees/**"],
  },
];
