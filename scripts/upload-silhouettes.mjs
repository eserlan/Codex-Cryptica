import { execFileSync } from 'child_process';
import { writeFileSync, unlinkSync, mkdirSync, rmdirSync, existsSync } from 'fs';
import { join } from 'path';
import { SILHOUETTES } from '../packages/schema/src/silhouettes.ts';

const BUCKET = 'codex-cryptica-statics';
const REMOTE_PREFIX = 'silhouettes';
const TEMP_DIR = join(process.cwd(), 'scratch_silhouettes');

if (!existsSync(TEMP_DIR)) {
  mkdirSync(TEMP_DIR, { recursive: true });
}

console.log(`Exporting and uploading ${SILHOUETTES.length} silhouettes to R2 bucket "${BUCKET}"...`);

const startFrom = process.argv.find(arg => arg.startsWith("--start-from="))?.split("=")[1];
let skip = Boolean(startFrom);
const uploaded = [];

for (const sil of SILHOUETTES) {
  if (skip) {
    if (sil.id === startFrom) {
      skip = false;
    } else {
      continue;
    }
  }
  const fileName = `${sil.id}.svg`;
  const filePath = join(TEMP_DIR, fileName);
  const targetPaths = [sil.r2Path, `${REMOTE_PREFIX}/${fileName}`].filter(Boolean);

  // Use the actual sil.svgContent from schema
  let svgContent = sil.svgContent.trim();
  
  // Ensure xmlns is present for standalone SVG compliance
  if (!svgContent.includes('xmlns="http://www.w3.org/2000/svg"')) {
    svgContent = svgContent.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  if (!existsSync(TEMP_DIR)) mkdirSync(TEMP_DIR, { recursive: true });
  writeFileSync(filePath, svgContent, 'utf-8');

  for (const remotePath of targetPaths) {
    console.log(`Uploading ${fileName} (${svgContent.length} bytes) to ${remotePath}...`);
    try {
      execFileSync('bunx', [
        'wrangler',
        'r2',
        'object',
        'put',
        `${BUCKET}/${remotePath}`,
        '--file',
        filePath,
        '--content-type',
        'image/svg+xml',
        '--remote'
      ], { stdio: 'inherit' });
    } catch (err) {
      console.error(`Failed to upload ${fileName} to ${remotePath}:`, err);
    }
  }

  uploaded.push({
    id: sil.id,
    name: sil.name,
    genre: sil.genres[0],
    category: sil.category,
    key: sil.r2Path,
    size: `${(Buffer.byteLength(svgContent) / 1024).toFixed(1)} KB`
  });

  if (existsSync(filePath)) {
    unlinkSync(filePath);
  }
}

if (existsSync(TEMP_DIR)) {
  rmdirSync(TEMP_DIR);
}

console.log(`Successfully uploaded ${uploaded.length} silhouettes to R2!`);
