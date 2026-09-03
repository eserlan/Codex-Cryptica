import { execFileSync } from "child_process";
import { readFileSync, readdirSync, statSync } from "fs";
import { join, resolve, basename } from "path";
import { pathToFileURL } from "url";
import { SILHOUETTES } from "../packages/schema/src/silhouettes.ts";

/**
 * Uploads traced silhouette artwork to R2.
 *
 * The catalogue in `packages/schema/src/silhouettes.ts` carries metadata only —
 * the SVGs live in the bucket, and per the repository rule image assets are
 * never committed here. So this reads the files from a working directory you
 * point it at (wherever the tracing pipeline dropped them), matches each to a
 * catalogue entry by filename, and uploads it to that entry's `r2Path` plus the
 * flat `silhouettes/<id>.svg` alias the public gallery links to.
 *
 *   bun scripts/upload-silhouettes.mjs ./traced-svgs [--start-from=<id>]
 *
 * Every file is validated before it is uploaded. Both rules below are things a
 * <canvas> will not forgive and a DOM render will silently paper over, so this
 * is the last place to catch them — see docs/SILHOUETTE_PIPELINE.md.
 */

const BUCKET = "codex-cryptica-statics";
const REMOTE_PREFIX = "silhouettes";
const CACHE_CONTROL = "public, max-age=86400";

/** Returns a list of problems; empty means the artwork is safe to publish. */
export function validateSilhouetteSvg(svg) {
  const problems = [];

  if (!svg.trimStart().startsWith("<svg")) {
    problems.push("does not start with an <svg> element");
    return problems;
  }

  // 1. Well-formed XML. The HTML parser drops a repeated attribute and carries
  //    on; an SVG loaded as an image refuses to decode, and the node paints as
  //    a flat block of colour with no glyph.
  for (const tag of svg.match(/<[a-z]+\b[^>]*>/g) ?? []) {
    if ((tag.match(/\bfill="/g) ?? []).length > 1) {
      problems.push("has two fill attributes on one element");
      break;
    }
  }

  // 2. An intrinsic size. Cytoscape samples a background image with a source
  //    rectangle taken from the image's own width/height, so without them a
  //    corner of the artwork is stretched across the whole node.
  const viewBox = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg);
  if (!viewBox) {
    problems.push('has no viewBox of the form "0 0 W H"');
  } else {
    const width = /^<svg[^>]*\bwidth="([\d.]+)"/.exec(svg)?.[1];
    const height = /^<svg[^>]*\bheight="([\d.]+)"/.exec(svg)?.[1];
    if (width !== viewBox[1] || height !== viewBox[2]) {
      problems.push(
        `declares width/height ${width}x${height}, viewBox says ${viewBox[1]}x${viewBox[2]}`,
      );
    }
  }

  // 3. Tintable. Every surface recolours the artwork for its theme, so it is
  //    not enough for `currentColor` to appear somewhere — a single hardcoded
  //    fill paints a hole no theme can reach.
  const TINTABLE_FILLS = new Set(["currentColor", "none"]);
  const fills = [...svg.matchAll(/\bfill="([^"]*)"/g)].map((m) => m[1]);
  const fixed = [...new Set(fills.filter((f) => !TINTABLE_FILLS.has(f)))];
  if (fixed.length > 0) {
    problems.push(
      `paints fills the theme cannot recolour: ${fixed.join(", ")}`,
    );
  } else if (!fills.includes("currentColor")) {
    problems.push("paints no currentColor, so it cannot be tinted");
  }

  return problems;
}

function findSourceFile(silhouette, sourceDir) {
  const candidates = [`${silhouette.id}.svg`, basename(silhouette.r2Path)];
  for (const name of candidates) {
    const path = join(sourceDir, name);
    try {
      if (statSync(path).isFile()) return path;
    } catch {
      // keep looking
    }
  }
  return null;
}

export function main() {
  const args = process.argv.slice(2);
  const sourceDir = resolve(args.find((a) => !a.startsWith("--")) ?? ".");
  const startFrom = args
    .find((a) => a.startsWith("--start-from="))
    ?.split("=")[1];
  const dryRun = args.includes("--dry-run");

  if (!args.some((a) => !a.startsWith("--"))) {
    console.error(
      "Usage: bun scripts/upload-silhouettes.mjs <dir-of-svgs> [--start-from=<id>] [--dry-run]",
    );
    process.exit(1);
  }

  let available;
  try {
    available = readdirSync(sourceDir).filter((f) => f.endsWith(".svg"));
  } catch {
    console.error(`Cannot read ${sourceDir}`);
    process.exit(1);
  }

  console.log(
    `Publishing from ${sourceDir} (${available.length} SVGs) to R2 bucket "${BUCKET}"...`,
  );

  let skip = Boolean(startFrom);
  const uploaded = [];
  const skipped = [];
  const invalid = [];

  for (const sil of SILHOUETTES) {
    if (skip) {
      if (sil.id === startFrom) skip = false;
      else continue;
    }

    const filePath = findSourceFile(sil, sourceDir);
    if (!filePath) {
      skipped.push(sil.id);
      continue;
    }

    const svg = readFileSync(filePath, "utf-8").trim();
    const problems = validateSilhouetteSvg(svg);
    if (problems.length > 0) {
      invalid.push(`${sil.id}: ${problems.join("; ")}`);
      continue;
    }

    for (const remotePath of [sil.r2Path, `${REMOTE_PREFIX}/${sil.id}.svg`]) {
      console.log(
        `Uploading ${sil.id} (${svg.length} bytes) to ${remotePath}...`,
      );
      if (dryRun) continue;
      try {
        execFileSync(
          "bunx",
          [
            "wrangler",
            "r2",
            "object",
            "put",
            `${BUCKET}/${remotePath}`,
            "--file",
            filePath,
            "--content-type",
            "image/svg+xml",
            "--cache-control",
            CACHE_CONTROL,
            "--remote",
          ],
          { stdio: "inherit" },
        );
      } catch (err) {
        console.error(`Failed to upload ${sil.id} to ${remotePath}:`, err);
        process.exitCode = 1;
      }
    }

    uploaded.push(sil.id);
  }

  console.log(`\nUploaded ${uploaded.length} silhouettes.`);
  if (skipped.length) {
    console.log(
      `No source file for ${skipped.length}: ${skipped.slice(0, 8).join(", ")}${skipped.length > 8 ? ", ..." : ""}`,
    );
  }
  if (invalid.length) {
    console.error(`\nRejected ${invalid.length} before upload:`);
    for (const line of invalid) console.error(`  ${line}`);
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  main();
}
