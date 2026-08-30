import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load as yamlLoad } from 'js-yaml';

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

let fullContent = `# Codex Cryptica - User Guide & Features

This file contains an amalgamation of the user-facing help documentation and core features of Codex Cryptica.

## What Codex Cryptica Is

Codex Cryptica is a local-first RPG campaign manager and worldbuilding tool for tabletop roleplaying games. It combines a Markdown vault, visual knowledge graph, AI lore assistant, map mode, lightweight VTT, spatial canvas, entity templates, and privacy-focused storage.

It is especially relevant to users searching for:

- RPG campaign manager
- Worldbuilding tool
- AI GM assistant
- Local-first RPG notes
- Private Obsidian alternative for worldbuilding
- Fantasy worldbuilding software
- RPG knowledge graph
- Lightweight VTT

`;

// 1. Extract Features from help-content.ts
if (fs.existsSync(helpContentFile)) {
  console.log('Extracting Features...');
  const content = fs.readFileSync(helpContentFile, 'utf8');
  
  // Restrict extraction to the FEATURE_HINTS object to avoid picking up onboarding hints
  const featureHintsMatch = content.match(/export const FEATURE_HINTS: Record<string, FeatureHint> = {([\s\S]*?)};/);
  
  if (featureHintsMatch) {
    fullContent += `## Core Features\n\n`;
    const featureHintsSection = featureHintsMatch[1];
    
    // Support single quotes, double quotes, and template literals for title and content
    const featureRegex = /title:\s*["'](.*?)["'],\s*content:\s*(?:"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|`([^`\\]*(?:\\.[^`\\]*)*)`)/gs;
    let match;
    while ((match = featureRegex.exec(featureHintsSection)) !== null) {
      const title = match[1];
      const rawContent = match[2] ?? match[3] ?? match[4] ?? '';
      const description = rawContent.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\'/g, "'");
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
        metadata = yamlLoad(frontmatterMatch[1]);
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

// 3. Add Answer Pages (/answers/[slug])
const answersDir = path.join(rootDir, 'apps/web/src/lib/content/answers/pages');
if (fs.existsSync(answersDir)) {
  console.log('Extracting Answer Pages...');

  // Registration order, taken from the registry's imports, so the agent-readable
  // index matches the order the site publishes them in.
  const indexSource = fs.readFileSync(path.join(answersDir, 'index.ts'), 'utf8');
  const slugs = [...indexSource.matchAll(/from '\.\/([a-z0-9-]+)'|from "\.\/([a-z0-9-]+)"/g)]
    .map(m => m[1] ?? m[2]);

  // Tolerant of both quote styles and of indentation, because Prettier
  // reformats these modules after they are written: it rewrites a string
  // containing a double quote into a single-quoted one, and re-indents a file
  // whose export name is long enough to wrap. A pattern assuming double quotes
  // at two spaces silently drops exactly those files.
  const readString = (content, field) => {
    const regex = new RegExp(
      `\\n[ \\t]*${field}:[ \\t]*\\n?[ \\t]*(?:"([^"\\\\]*(?:\\\\.[^"\\\\]*)*)"|'([^'\\\\]*(?:\\\\.[^'\\\\]*)*)')`,
    );
    const match = content.match(regex);
    if (!match) return '';
    const raw = match[1] ?? match[2] ?? '';
    return raw
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'")
      .replace(/\\\\/g, '\\')
      .trim();
  };

  const entries = [];
  for (const slug of slugs) {
    const file = path.join(answersDir, `${slug}.ts`);
    if (!fs.existsSync(file)) {
      console.warn(`[llms-full] Answer module missing for slug: ${slug}`);
      continue;
    }
    const content = fs.readFileSync(file, 'utf8');
    const question = readString(content, 'question');
    const shortAnswer = readString(content, 'shortAnswer');
    if (!question || !shortAnswer) {
      // Fatal on purpose: a silent skip here removes a page from the
      // agent-readable index with no visible failure.
      throw new Error(
        `[llms-full] Could not extract question/shortAnswer for answer: ${slug}`,
      );
    }
    entries.push({ slug, question, shortAnswer });
  }

  if (entries.length !== slugs.length) {
    throw new Error(
      `[llms-full] Extracted ${entries.length} answers but the registry imports ${slugs.length}.`,
    );
  }

  if (entries.length > 0) {
    fullContent += `\n## Answer Pages\n\n`;
    fullContent += `Reference answers to real RPG and worldbuilding questions, indexed at https://codexcryptica.com/answers. Each page states the direct answer first, then the framework behind it and a concrete example.\n\n`;
    for (const entry of entries) {
      fullContent += `### [${entry.question}](https://codexcryptica.com/answers/${entry.slug})\n\n`;
      fullContent += `**Direct answer:** ${entry.shortAnswer}\n\n`;
    }
  }
}

// 4. Add curated generator examples (/examples/[slug])
const examplesDir = path.join(rootDir, 'apps/web/src/lib/content/examples/pages');
if (fs.existsSync(examplesDir)) {
  console.log('Extracting Curated Examples...');

  const indexSource = fs.readFileSync(path.join(examplesDir, 'index.ts'), 'utf8');
  const slugs = [...indexSource.matchAll(/from '\.\/([a-z0-9-]+)'|from "\.\/([a-z0-9-]+)"/g)]
    .map(m => m[1] ?? m[2]);

  const readString = (content, field) => {
    const regex = new RegExp(
      `\\n[ \\t]*${field}:[ \\t]*\\n?[ \\t]*(?:"([^"\\\\]*(?:\\\\.[^"\\\\]*)*)"|'([^'\\\\]*(?:\\\\.[^'\\\\]*)*)')`,
    );
    const match = content.match(regex);
    if (!match) return '';
    return (match[1] ?? match[2] ?? '')
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'")
      .replace(/\\\\/g, '\\')
      .trim();
  };

  const entries = [];
  for (const slug of slugs) {
    const file = path.join(examplesDir, `${slug}.ts`);
    if (!fs.existsSync(file)) {
      throw new Error(`[llms-full] Example module missing for slug: ${slug}`);
    }
    const content = fs.readFileSync(file, 'utf8');
    const title = readString(content, 'title');
    const summary = readString(content, 'summary');
    const genre = readString(content, 'genre');
    if (!title || !summary) {
      throw new Error(`[llms-full] Could not extract title/summary for example: ${slug}`);
    }
    entries.push({ slug, title, summary, genre });
  }

  if (entries.length !== slugs.length) {
    throw new Error(
      `[llms-full] Extracted ${entries.length} examples but the registry imports ${slugs.length}.`,
    );
  }

  if (entries.length > 0) {
    fullContent += `\n## Curated Generator Examples\n\n`;
    fullContent += `Real, unedited output from the Codex Cryptica generators, indexed at https://codexcryptica.com/examples. Each page shows the full artefact, the settings that produced it, and a short editorial note on what makes it usable at the table.\n\n`;
    for (const entry of entries) {
      fullContent += `### [${entry.title}](https://codexcryptica.com/examples/${entry.slug})\n\n`;
      if (entry.genre) fullContent += `**Genre:** ${entry.genre}\n\n`;
      fullContent += `**Summary:** ${entry.summary}\n\n`;
    }
  }
}

// 5. Add TTRPG System & Genre Landing Pages
const packsDir = path.join(rootDir, 'apps/web/src/lib/content/for/packs');
if (fs.existsSync(packsDir)) {
  console.log('Extracting TTRPG System & Genre Landing Pages...');
  const packFiles = fs.readdirSync(packsDir).filter(f => f.endsWith('.ts') && f !== 'index.ts');
  packFiles.sort();

  function extractField(content, fieldName) {
    const regex = new RegExp(`${fieldName}:\\s*(?:"([^"\\\\]*(?:\\\\.[^"\\\\]*)*)"|'([^'\\\\]*(?:\\\\.[^'\\\\]*)*)'|\`([^\`\\\\]*(?:\\\\.[^\`\\\\]*)*)\`)`, 's');
    const match = content.match(regex);
    if (!match) return '';
    const raw = match[1] ?? match[2] ?? match[3] ?? '';
    return raw.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\'/g, "'").trim();
  }

  fullContent += `\n## TTRPG System & Genre Campaign Management\n\n`;
  fullContent += `Codex Cryptica provides specialized, tailored landing pages, knowledge graphs, and toolsets for major tabletop RPG systems and worldbuilding genres:\n\n`;

  for (const file of packFiles) {
    const filePath = path.join(packsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');

    const slug = extractField(content, 'slug');
    const heroTitleMatch = content.match(/title:\s*["'](Codex Cryptica for [^"']+)["']/);
    const title = heroTitleMatch ? heroTitleMatch[1] : extractField(content, 'title');
    const tagline = extractField(content, 'tagline');
    const problem = extractField(content, 'problemStatement');

    if (slug && title) {
      fullContent += `### [${title}](https://codexcryptica.com/for/${slug})\n\n`;
      if (tagline) fullContent += `**Summary:** ${tagline}\n\n`;
      if (problem) fullContent += `**Overview:** ${problem}\n\n`;
    }
  }
}

fs.writeFileSync(outputPath, fullContent);
const rootOutputPath = path.join(rootDir, 'llms-full.txt');
fs.writeFileSync(rootOutputPath, fullContent);
console.log(`\n✅ Generated ${outputPath} (${(fullContent.length / 1024).toFixed(2)} KB)`);
console.log(`✅ Generated ${rootOutputPath} (${(fullContent.length / 1024).toFixed(2)} KB)`);

