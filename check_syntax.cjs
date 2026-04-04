const fs = require('fs');
const content = fs.readFileSync('apps/web/src/lib/components/campaign/FrontPage.svelte', 'utf8');

const scriptMatch = content.match(/<script.*?>([\s\S]*?)<\/script>/);
if (!scriptMatch) {
  console.log('No script block found');
  process.exit(1);
}

const script = scriptMatch[1];
const lines = script.split('\n');

let openBraces = 0;
let openParens = 0;
let inString = null;
let inComment = false;
let inBlockComment = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  inComment = false;
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    const nextChar = line[j+1];

    if (inBlockComment) {
      if (char === '*' && nextChar === '/') {
        inBlockComment = false;
        j++;
      }
      continue;
    }

    if (inComment) break;

    if (inString) {
      if (char === '\\') {
        j++;
        continue;
      }
      if (char === inString) {
        inString = null;
      }
      continue;
    }

    if (char === '/' && nextChar === '/') {
      inComment = true;
      continue;
    }
    if (char === '/' && nextChar === '*') {
      inBlockComment = true;
      j++;
      continue;
    }

    if (char === "'" || char === '"' || char === '`') {
      inString = char;
      continue;
    }

    if (char === '{') openBraces++;
    if (char === '}') openBraces--;
    if (char === '(') openParens++;
    if (char === ')') openParens--;

    if (openBraces < 0 || openParens < 0) {
      console.log(`Negative count at line ${i + 1}, char ${j + 1}: ${char}. Braces: ${openBraces}, Parens: ${openParens}`);
    }
  }
}

console.log(`Final counts - Braces: ${openBraces}, Parens: ${openParens}`);
if (openBraces !== 0 || openParens !== 0) {
  process.exit(1);
}
