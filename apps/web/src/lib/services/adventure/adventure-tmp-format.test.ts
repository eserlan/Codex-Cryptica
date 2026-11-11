import { it } from "vitest";
import { readFile } from "node:fs/promises";

it("TEMP_FORMAT_CAPTURE", async () => {
  const prettier = await import("prettier/standalone");
  const typescript = await import("prettier/plugins/typescript");
  const estree = await import("prettier/plugins/estree");
  const svelte = await import("prettier-plugin-svelte");
  const targets = [
    "../../components/oracle/adventure/AdventureSurface.svelte",
    "../../stores/oracle/adventure-manager.svelte.ts",
    "../../stores/oracle/tests/adventure-scenarios.test.ts",
  ];
  const output: Record<string, string> = {};
  for (const file of targets) {
    const location = new URL(file, import.meta.url);
    const source = await readFile(location, "utf8");
    const formatted = await prettier.format(source, {
      parser: file.endsWith(".svelte") ? "svelte" : "typescript",
      plugins: [typescript, estree, svelte],
      semi: true,
      singleQuote: false,
      trailingComma: "all",
      tabWidth: 2,
      useTabs: false,
    });
    output[file] = formatted;
  }
  throw new Error("FORMAT_CAPTURE_" + JSON.stringify(output));
});
