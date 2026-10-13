import fs from 'fs';

const file = 'packages/generator-engine/src/session-prep/model.ts';
let content = fs.readFileSync(file, 'utf8');

// Prepend import
content = 'import { systemIdGenerator } from "@codex/runtime";\n' + content;

// Replace usage
content = content.replace(
  'export const defaultIdFactory: IdFactory = () => crypto.randomUUID();',
  'export const defaultIdFactory: IdFactory = () => systemIdGenerator.uuid();'
);

fs.writeFileSync(file, content);
