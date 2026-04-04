const fs = require('fs');
const content = fs.readFileSync('apps/web/src/lib/components/campaign/FrontPage.svelte', 'utf8');

const template = content.replace(/<script.*?>[\s\S]*?<\/script>/, '');

let openBraces = 0;
let inString = null;

for (let i = 0; i < template.length; i++) {
  const char = template[i];
  if (inString) {
    if (char === '\\') { i++; continue; }
    if (char === inString) inString = null;
    continue;
  }
  if (char === '"' || char === "'") { inString = char; continue; }
  
  if (char === '{') openBraces++;
  if (char === '}') openBraces--;
  
  if (openBraces < 0) {
    console.log(`Negative braces at index ${i}: ${template.substring(i-20, i+20)}`);
  }
}

console.log(`Final template braces: ${openBraces}`);
if (openBraces !== 0) process.exit(1);
