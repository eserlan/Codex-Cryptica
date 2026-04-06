const fs = require('fs');
const content = fs.readFileSync('apps/web/src/lib/components/campaign/FrontPage.svelte', 'utf8');

const scriptMatch = content.match(/<script.*?>([\s\S]*?)<\/script>/);
const script = scriptMatch[1];
const scriptOffset = content.indexOf(script);

function check(text, name) {
  let openBraces = 0;
  let inString = null;
  let inComment = false;
  let inBlockComment = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i+1];

    if (inBlockComment) {
      if (char === '*' && nextChar === '/') { inBlockComment = false; i++; }
      continue;
    }
    if (inComment) {
      if (char === '\n') inComment = false;
      continue;
    }

    if (inString) {
      if (char === '\\') { i++; continue; }
      if (char === inString) inString = null;
      continue;
    }

    if (char === '/' && nextChar === '/') { inComment = true; i++; continue; }
    if (char === '/' && nextChar === '*') { inBlockComment = true; i++; continue; }

    if (char === '"' || char === "'" || char === '`') { inString = char; continue; }
    
    if (char === '{') openBraces++;
    if (char === '}') {
      openBraces--;
      if (openBraces < 0) {
        console.log(`Negative braces in ${name} at absolute index ${scriptOffset + i} (char: ${char})`);
        const start = Math.max(0, i - 50);
        const end = Math.min(text.length, i + 50);
        console.log(`Context:\n...${text.substring(start, end)}...`);
      }
    }
  }
  console.log(`${name} final braces: ${openBraces}`);
}

check(script, 'Script');
