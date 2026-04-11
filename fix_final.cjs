const fs = require('fs');

let testCode = fs.readFileSync('apps/web/src/tests/search.test.ts', 'utf8');

testCode = testCode.replace(
  'expect((service as any).needsFullContentSweep).toBe(true);',
  'expect((service as any).needsFullContentSweep).toBe(true);'
);

// We need to restore the mock setup for mockApi.add exactly as it was originally
// because other tests might rely on it.
let replacementStr = `    mockApi.add.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            pendingAdds.push(resolve);
          }),
      );`;

testCode = testCode.replace(
  '// mockApi.add.mockImplementation(',
  replacementStr
);

fs.writeFileSync('apps/web/src/tests/search.test.ts', testCode);
