import fs from "fs";
import path from "path";

const VAULT_DIR = path.join(process.cwd(), "vault-5k");

if (!fs.existsSync(VAULT_DIR)) {
  fs.mkdirSync(VAULT_DIR);
}

for (let i = 1; i <= 5000; i++) {
  const id = `node-${i}`;
  const links = [];
  for (let j = 0; j < 3; j++) {
    if (i > 1) {
      links.push(`[[node-${Math.floor(Math.random() * (i - 1)) + 1}]]`);
    }
  }

  const content = `---\nid: ${id}\ntitle: Node ${i}\ntype: character\ntags: [stress-test, performance]\n---\n\n# Chronicle for Node ${i}\n\nThis is a generated node for performance benchmarking of the Web Worker Architecture.\nIt contains some random text to simulate a realistic chronicle size.\n\n${"Lore ".repeat(50)}\n\n## Connections\n${links.join("\n")}\n`;
  fs.writeFileSync(path.join(VAULT_DIR, `${id}.md`), content);
}

console.log(`Created 5,000 stress test nodes in ${VAULT_DIR}`);
