const fs = require('fs');

let testCode = fs.readFileSync('apps/web/src/tests/search.test.ts', 'utf8');
testCode = testCode.replace(
  '// expect((service as any).needsFullContentSweep).toBe(true);',
  'expect((service as any).needsFullContentSweep).toBe(true);'
);

testCode = testCode.replace(
  '// const originalAdd = mockApi.add.getMockImplementation();',
  ''
);

testCode = testCode.replace(
  '// () => new Promise<void>((resolve) => { pendingAdds.push(resolve); }), );',
  ''
);

testCode = testCode.replace(
  '// mockApi.add.mockImplementation(',
  ''
);

testCode = testCode.replace(
  '// mockApi.add.mockImplementation(originalAdd as any);',
  ''
);

fs.writeFileSync('apps/web/src/tests/search.test.ts', testCode);
