import fs from 'fs';
import path from 'path';

const VAULT_DIR = path.join(process.cwd(), 'vault-stress-test');

if (!fs.existsSync(VAULT_DIR)) {
  fs.mkdirSync(VAULT_DIR);
}

for (let i = 1; i <= 120; i++) {
  const id = `node-${i}`;
  const links = [];
  if (i > 1) links.push(`[[node-${Math.floor(Math.random() * (i - 1)) + 1}]]`);
  if (i > 5) links.push(`[[node-${Math.floor(Math.random() * 5) + 1}]]`);

  const content = `---
title: Node ${i}
---

This is stress test node ${i}.

Links:
${links.join('\n')}
`;
  fs.writeFileSync(path.join(VAULT_DIR, `${id}.md`), content);
}

console.log(`Created 120 stress test nodes in ${VAULT_DIR}`);
