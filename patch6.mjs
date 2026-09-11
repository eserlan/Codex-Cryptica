import fs from 'fs';

const filepath = 'apps/web/src/lib/components/canvas/CanvasWorkspace.svelte';
let content = fs.readFileSync(filepath, 'utf8');

content = content.replace(/import \{ SvelteMap \} from "svelte\/reactivity";\n/g, "");
content = content.replace(/    accumulateRotationDegrees,\n    canvasNodeRotation,\n/g, "");
content = content.replace(/    pointerAngleDegrees,\n/g, "");
content = content.replace(/  let touchRotationGesture: \{\n    nodeId: string;\n    pointerIds: \[number, number\];\n    previousAngle: number;\n    rotation: number;\n  \} \| null = null;\n/g, "");
content = content.replace(/  let desktopRotationGesture: \{\n    nodeId: string;\n    pointerId: number;\n    center: \{ x: number; y: number \};\n    previousAngle: number;\n    rotation: number;\n  \} \| null = null;\n/g, "");

fs.writeFileSync(filepath, content);
