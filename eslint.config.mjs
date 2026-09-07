import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Sibling git worktrees (.claude/worktrees/<branch>) live INSIDE the root
    // checkout, so a root `npm run lint` walks their build output too — and
    // `.next/**` above is root-relative, so it doesn't cover theirs. Each
    // worktree lints its own source from its own directory; from here the whole
    // tree is somebody else's branch.
    ".claude/worktrees/**",
  ]),
]);

export default eslintConfig;
