const fs = require('fs');

let testCode = fs.readFileSync('apps/web/src/tests/search.test.ts', 'utf8');

testCode = testCode.replace(
  '    } finally {\n      \n    }',
  ''
);

fs.writeFileSync('apps/web/src/tests/search.test.ts', testCode);
