import fs from 'fs';

const filepath = 'apps/web/src/lib/components/canvas/CanvasWorkspace.svelte';
let content = fs.readFileSync(filepath, 'utf8');

content = content.replace(/    type CanvasDrawingPoint,\n/g, "");

fs.writeFileSync(filepath, content);
