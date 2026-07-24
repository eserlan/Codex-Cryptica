import fs from 'fs';

const replies = [
  {
    "comment_id": "5068907365",
    "reply": "I've added a new file `apps/web/src/lib/components/canvas/use-canvas-logic.test.ts` to test that `createCanvasLogic` uses the injected `IdGenerator` properly during edge creation in `onConnect` and as a fallback in `syncEngine`. The newly added tests pass successfully."
  }
];

fs.writeFileSync('replies.json', JSON.stringify(replies));
