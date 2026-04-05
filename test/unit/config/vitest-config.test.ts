import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

describe("vitest config", () => {
  it("does not hardcode next/navigation to a repo-local node_modules path", () => {
    const configSource = readFileSync(
      path.resolve(process.cwd(), "vitest.config.ts"),
      "utf8"
    );

    expect(configSource).toContain('"next/navigation"');
    expect(configSource).not.toContain(
      'path.resolve(__dirname, "node_modules/next/dist/client/components/navigation.js")'
    );
  });
});
