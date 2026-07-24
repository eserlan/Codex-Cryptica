import fs from "node:fs";
import { convertThreadWeaverJsonToCif } from "@codex/importer";

export function convertThreadWeaverToCif(
  inputPath: string,
  outputPath?: string,
) {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  const raw = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  const cifPackage = convertThreadWeaverJsonToCif(raw);

  const targetPath = outputPath || inputPath.replace(/\.json$/, ".cif.json");
  fs.writeFileSync(targetPath, JSON.stringify(cifPackage, null, 2), "utf8");
  return { targetPath, cifPackage };
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  if (!args[0]) {
    console.log(
      "Usage: bun scripts/convert-twe-to-cif.ts <input_json_path> [output_cif_json_path]",
    );
    process.exit(1);
  }
  const { targetPath, cifPackage } = convertThreadWeaverToCif(args[0], args[1]);
  console.log(
    `Successfully converted ${cifPackage.entities.length} entities and ${cifPackage.relationships.length} relationships to ${targetPath}`,
  );
}
