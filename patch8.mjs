import fs from 'fs';

const filepath = 'apps/web/src/lib/components/canvas/CanvasWorkspace.svelte';
let content = fs.readFileSync(filepath, 'utf8');

const regex = /  let desktopRotationGesture: \{\n    nodeId: string;\n    pointerId: number;\n    center: CanvasDrawingPoint;\n    previousAngle: number;\n    rotation: number;\n  \} \| null = null;\n/;
content = content.replace(regex, "");

fs.writeFileSync(filepath, content);
