import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

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
  
  // Restrict extraction to the FEATURE_HINTS object to avoid picking up onboarding hints
  const featureHintsMatch = content.match(/export const FEATURE_HINTS: Record<string, FeatureHint> = {([\s\S]*?)};/);
  
  if (featureHintsMatch) {
    fullContent += `## Core Features\n\n`;
    const featureHintsSection = featureHintsMatch[1];
    
    // Use a more robust regex with /s flag for multi-line support
    const featureRegex = /title:\s*"(.*?)",\s*content:\s*"(.*?)"/gs;
    let match;
    while ((match = featureRegex.exec(featureHintsSection)) !== null) {
      const title = match[1];
      const description = match[2].replace(/\\n/g, '\n'); // Handle escaped newlines
      fullContent += `### ${title}\n${description}\n\n`;
    }
  }
}

// 2. Add Help Articles
const helpFiles = getFiles(helpDir, '.md');
if (helpFiles.length > 0) {
  console.log('Processing Help Articles...');
  
  const helpArticles = helpFiles.map(file => {
    const rawContent = fs.readFileSync(file, 'utf8');
    const filename = path.basename(file, '.md');
    
    // Use a bounded regex for frontmatter to avoid performance issues
    const frontmatterMatch = rawContent.match(/^---\r?\n([\s\S]{0,10000}?)\r?\n---\r?\n?/);
    
    let content = rawContent;
    let metadata = {};
    
    if (frontmatterMatch) {
      try {
        metadata = yaml.load(frontmatterMatch[1]);
        content = rawContent.slice(frontmatterMatch[0].length).trim();
      } catch (e) {
        console.warn(`Failed to parse YAML in ${filename}:`, e.message);
        content = rawContent.replace(/^---[\s\S]*?---/, '').trim();
      }
    }
    
    // Strip leading H1/H2 headings from the article content to avoid heading level conflicts
    content = content.replace(/^#{1,2}\s.*\n?/, '').trimStart();
    
    const title = (metadata.title || filename.replace(/-/g, ' ')).toUpperCase();
    const rank = metadata.rank !== undefined ? metadata.rank : 999;
    
    return {
      title,
      content,
      rank,
      filename
    };
  });
  
  // Sort by rank (ascending), then by title
  helpArticles.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return a.title.localeCompare(b.title);
  });
  
  fullContent += `\n## Help Documentation\n`;
  for (const article of helpArticles) {
    console.log(`Adding Help Article: ${article.filename} (Rank: ${article.rank})`);
    fullContent += `\n### ${article.title}\n\n${article.content}\n\n---\n`;
  }
}

fs.writeFileSync(outputPath, fullContent);
console.log(`\n✅ Generated ${outputPath} (${(fullContent.length / 1024).toFixed(2)} KB)`);
