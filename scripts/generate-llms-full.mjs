import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const outputPath = path.join(rootDir, 'apps/web/static/llms-full.txt');

const filesToConcatenate = [
  // Core project READMEs that currently exist and should always be included.
  { name: 'Root README', path: 'README.md' },
  { name: 'Web App README', path: 'apps/web/README.md' },
  // NOTE: Package READMEs for editor-core, graph-engine, importer, and schema
  // are not included here because they do not currently exist in the repository.
  // If/when those packages gain README files, add them to this list to include
  // their documentation in the generated llms-full.txt file.
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
    // Only include interfaces, types, and enums exports to keep it focused,
    // but capture complete multi-line declarations instead of just the first line.
    const allLines = content.split('\n');
    const exportedBlocks = [];
    const exportDeclRegex = /^\s*export\s+(interface|type|enum)\b/;

    let collecting = false;
    let currentBlock = [];
    let braceDepth = 0;

    const countChar = (line, ch) => (line.match(new RegExp(`\\${ch}`, 'g')) || []).length;

    for (const line of allLines) {
      if (!collecting) {
        if (exportDeclRegex.test(line)) {
          collecting = true;
          currentBlock.push(line);
          braceDepth += countChar(line, '{');
          braceDepth -= countChar(line, '}');

          // Handle single-line type/interface/enum declarations that end immediately.
          if (braceDepth === 0 && line.includes(';')) {
            exportedBlocks.push(currentBlock.join('\n'));
            currentBlock = [];
            collecting = false;
          }
        }
      } else {
        currentBlock.push(line);
        braceDepth += countChar(line, '{');
        braceDepth -= countChar(line, '}');

        // End the block when we've closed all braces (for interfaces/enums)
        // or reached a terminating semicolon for types with no braces.
        const trimmed = line.trim();
        if (
          braceDepth === 0 &&
          (trimmed.endsWith('}') || trimmed.endsWith(';'))
        ) {
          exportedBlocks.push(currentBlock.join('\n'));
          currentBlock = [];
          collecting = false;
        }
      }
    }

    if (exportedBlocks.length > 0) {
      fullContent += `\n### ${path.basename(file)}\n\n\`\`\`typescript\n${exportedBlocks.join('\n\n')}\n\`\`\`\n`;
    }
  }
}

fs.writeFileSync(outputPath, fullContent);
console.log(`\n✅ Generated ${outputPath} (${(fullContent.length / 1024).toFixed(2)} KB)`);
