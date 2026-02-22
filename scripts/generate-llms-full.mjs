import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const outputPath = path.join(rootDir, 'apps/web/static/llms-full.txt');

const filesToConcatenate = [
  { name: 'Root README', path: 'README.md' },
  { name: 'Web App README', path: 'apps/web/README.md' },
  { name: 'Editor Core README', path: 'packages/editor-core/README.md' },
  { name: 'Graph Engine README', path: 'packages/graph-engine/README.md' },
  { name: 'Importer README', path: 'packages/importer/README.md' },
  { name: 'Schema README', path: 'packages/schema/README.md' },
];

const adrDir = path.join(rootDir, 'docs/adr');
const schemaDir = path.join(rootDir, 'packages/schema/src');

function getFiles(dir, extension) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(file => file.endsWith(extension))
    .map(file => path.join(dir, file));
}

let fullContent = `# Codex Cryptica Full Knowledge Base\n\nThis file contains concatenated technical documentation for the Codex Cryptica project.\n\n`;

for (const file of filesToConcatenate) {
  const absolutePath = path.join(rootDir, file.path);
  if (fs.existsSync(absolutePath)) {
    console.log(`Adding ${file.name}...`);
    const content = fs.readFileSync(absolutePath, 'utf8');
    fullContent += `\n--- START OF ${file.name} ---\n\n${content}\n\n--- END OF ${file.name} ---\n`;
  }
}

// Add ADRs
const adrFiles = getFiles(adrDir, '.md');
if (adrFiles.length > 0) {
  fullContent += `\n## Architecture Decision Records (ADRs)\n`;
  for (const file of adrFiles) {
    console.log(`Adding ADR: ${path.basename(file)}...`);
    const content = fs.readFileSync(file, 'utf8');
    fullContent += `\n### ${path.basename(file)}\n\n${content}\n`;
  }
}

// Add Schema Interfaces
const schemaFiles = getFiles(schemaDir, '.ts').filter(f => !f.endsWith('.test.ts'));
if (schemaFiles.length > 0) {
  fullContent += `\n## Core Schema Interfaces\n`;
  for (const file of schemaFiles) {
    console.log(`Adding Schema: ${path.basename(file)}...`);
    const content = fs.readFileSync(file, 'utf8');
    // Only include interfaces and type exports to keep it focused
    const lines = content.split('\n').filter(line => 
      line.startsWith('export interface') || 
      line.startsWith('export type') || 
      line.startsWith('export enum')
    );
    if (lines.length > 0) {
      fullContent += `\n### ${path.basename(file)}\n\n\`\`\`typescript\n${lines.join('\n')}\n\`\`\`\n`;
    }
  }
}

fs.writeFileSync(outputPath, fullContent);
console.log(`\n✅ Generated ${outputPath} (${(fullContent.length / 1024).toFixed(2)} KB)`);
