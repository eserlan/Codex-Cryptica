import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const outputPath = path.join(rootDir, 'apps/web/static/llms-full.txt');

const helpDir = path.join(rootDir, 'apps/web/src/lib/content/help');
const helpContentFile = path.join(rootDir, 'apps/web/src/lib/config/help-content.ts');

function getFiles(dir, extension) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(file => file.endsWith(extension))
    .map(file => path.join(dir, file));
}

let fullContent = `# Codex Cryptica - User Guide & Features\n\nThis file contains an amalgamation of the user-facing help documentation and core features of Codex Cryptica.\n\n`;

// 1. Extract Features from help-content.ts
if (fs.existsSync(helpContentFile)) {
  console.log('Extracting Features...');
  const content = fs.readFileSync(helpContentFile, 'utf8');
  
  fullContent += `## Core Features\n\n`;
  
  // Use a simple regex to find title and content in FEATURE_HINTS
  const featureRegex = /title:\s*"(.*?)",\s*content:\s*"(.*?)"/g;
  let match;
  while ((match = featureRegex.exec(content)) !== null) {
    const title = match[1];
    const description = match[2];
    fullContent += `### ${title}\n${description}\n\n`;
  }
}

// 2. Add Help Articles
const helpFiles = getFiles(helpDir, '.md');
if (helpFiles.length > 0) {
  fullContent += `\n## Help Documentation\n`;
  for (const file of helpFiles) {
    console.log(`Adding Help Article: ${path.basename(file)}...`);
    let content = fs.readFileSync(file, 'utf8');
    
    // Strip YAML frontmatter if present
    content = content.replace(/^---[\s\S]*?---/, '').trim();
    
    fullContent += `\n### ${path.basename(file, '.md').replace(/-/g, ' ').toUpperCase()}\n\n${content}\n\n---\n`;
  }
}

fs.writeFileSync(outputPath, fullContent);
console.log(`\n✅ Generated ${outputPath} (${(fullContent.length / 1024).toFixed(2)} KB)`);
