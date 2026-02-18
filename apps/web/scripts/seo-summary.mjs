import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseDir = path.resolve(__dirname, '../audit-report');

if (!fs.existsSync(baseDir)) {
  console.error('❌ Audit report directory not found at: ' + baseDir);
  process.exit(1);
}

function findJsonFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      findJsonFiles(fullPath, files);
    } else if (item === 'lighthouse.json') {
      files.push(fullPath);
    }
  }
  return files;
}

const jsonFiles = findJsonFiles(baseDir);

if (jsonFiles.length === 0) {
  console.error('❌ No lighthouse.json reports found in ' + baseDir);
  process.exit(1);
}

console.log('\n📊 SEO & PERFORMANCE AUDIT SUMMARY\n');
console.log('| Route | Perf | A11y | Best Pr. | SEO |');
console.log('| :--- | :---: | :---: | :---: | :---: |');

let failure = false;

for (const fullPath of jsonFiles) {
  try {
    const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    
    let route = data.requestedUrl.replace('http://localhost:4173', '') || '/';
    if (!route || route === '/') route = '/';
    
    const cats = data.categories;
    
    const scores = {
      perf: Math.round((cats.performance?.score || 0) * 100),
      a11y: Math.round((cats.accessibility?.score || 0) * 100),
      best: Math.round((cats['best-practices']?.score || 0) * 100),
      seo: Math.round((cats.seo?.score || 0) * 100)
    };

    const status = (val) => val >= 90 ? '🟢' : (val >= 50 ? '🟡' : '🔴');

    console.log(`| ${route} | ${status(scores.perf)} ${scores.perf} | ${status(scores.a11y)} ${scores.a11y} | ${status(scores.best)} ${scores.best} | ${status(scores.seo)} ${scores.seo} |`);

    if (scores.seo < 90 || scores.a11y < 90) {
      failure = true;
    }
  } catch (err) {
    console.error(`❌ Failed to parse report:`, err.message);
  }
}

console.log('\n📂 Full reports available in: apps/web/audit-report/\n');

if (failure) {
  console.log('⚠️ Budget violation detected (SEO/A11y < 90).');
}
