const fs = require('fs');

let testCode = fs.readFileSync('apps/web/src/tests/search.test.ts', 'utf8');

testCode = testCode.replace(
  '    mockApi.addBatch = vi.fn().mockImplementation(() => new Promise((resolve) => pendingAdds.push(resolve)));\n    mockApi.addBatch = vi.fn().mockImplementation(() => new Promise((resolve) => pendingAdds.push(resolve)));\n    try {\n      \n        \n\n      (service as any).api = mockApi;',
  '    mockApi.addBatch = vi.fn().mockImplementation(() => new Promise((resolve) => pendingAdds.push(resolve)));\n\n      (service as any).api = mockApi;'
);

fs.writeFileSync('apps/web/src/tests/search.test.ts', testCode);
