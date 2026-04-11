const fs = require('fs');

let testCode = fs.readFileSync('apps/web/src/tests/search.test.ts', 'utf8');

testCode = testCode.replace(
  '    try {\n      mockApi.addBatch = vi.fn().mockImplementation(() => new Promise((resolve) => pendingAdds.push(resolve)));',
  '    mockApi.addBatch = vi.fn().mockImplementation(() => new Promise((resolve) => pendingAdds.push(resolve)));'
);

fs.writeFileSync('apps/web/src/tests/search.test.ts', testCode);
