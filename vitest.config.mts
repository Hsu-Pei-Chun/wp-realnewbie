import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": dirname,
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    // .claude/worktrees/* are sibling git worktrees for other concurrent
    // sessions, each with their own node_modules — a bare `vitest run`
    // would otherwise scan into them and fail on unrelated pollution.
    // .next/** is excluded because `next build` with output: "standalone"
    // copies traced content files (including content/topics/**'s tests)
    // into .next/standalone, and vitest would otherwise pick those up too.
    exclude: [...configDefaults.exclude, "**/.claude/**", "**/.next/**"],
  },
});
