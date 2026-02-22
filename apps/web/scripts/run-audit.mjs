import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(__dirname, '..');
const reportDir = path.join(pkgRoot, 'audit-report');

const SITE_URL = process.env.SITE_URL || 'http://localhost:4173';
const ROUTES = ['/', '/features', '/privacy', '/terms'];

// Ensure report directory exists
if (!fs.existsSync(reportDir)) {
  fs.mkdirSync(reportDir, { recursive: true });
}

// Try to find a chrome path
let chromePath = process.env.CHROME_PATH;
if (!chromePath) {
  const pwCache = path.join(process.env.HOME || '', '.cache/ms-playwright');
  if (fs.existsSync(pwCache)) {
    try {
      const findChrome = execSync(`find ${pwCache} -name chrome | grep chromium | head -n 1`).toString().trim();
      if (findChrome) chromePath = findChrome;
    } catch (__e) {
      // Fallback to system chrome
    }
  }
}

function runLighthouse(route) {
  const url = `${SITE_URL}${route === '/' ? '' : route}`;
  const filename = `report-${route.replace(/\//g, 'root') || 'index'}.json`;
  const outputPath = path.join(reportDir, filename);

  console.log(`Auditing ${url}...`);
  
  const env = { ...process.env };
  if (chromePath) env.CHROME_PATH = chromePath;

  try {
    execSync(
      `npx lighthouse ${url} --quiet --chrome-flags="--headless --no-sandbox" --output json --output-path ${outputPath} --no-enable-error-reporting`,
      { stdio: 'inherit', env }
    );
    return JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  } catch (err) {
    console.error(`❌ Failed to audit ${url}:`, err.message);
    return null;
  }
}

console.log(`
🚀 Starting Lighthouse Audit for ${SITE_URL}
`);

const results = [];
for (const route of ROUTES) {
  const data = runLighthouse(route);
  if (data) {
    const cats = data.categories;
    results.push({
      route,
      perf: Math.round((cats.performance?.score || 0) * 100),
      a11y: Math.round((cats.accessibility?.score || 0) * 100),
      best: Math.round((cats['best-practices']?.score || 0) * 100),
      seo: Math.round((cats.seo?.score || 0) * 100)
    });
  }
}

console.log(`
📊 SEO & PERFORMANCE AUDIT SUMMARY
`);
console.log('| Route | Perf | A11y | Best Pr. | SEO |');
console.log('| :--- | :---: | :---: | :---: | :---: |');

let failure = false;
const status = (val) => val >= 90 ? '🟢' : (val >= 50 ? '🟡' : '🔴');

for (const res of results) {
  console.log(`| ${res.route} | ${status(res.perf)} ${res.perf} | ${status(res.a11y)} ${res.a11y} | ${status(res.best)} ${res.best} | ${status(res.seo)} ${res.seo} |`);
  if (res.seo < 90 || res.a11y < 90) failure = true;
}

console.log(`
📂 Full reports available in: ${reportDir}
`);

if (failure) {
  console.log('⚠️ Budget violation detected (SEO/A11y < 90).');
  process.exit(1);
} else {
  console.log('✅ Audit passed successfully.');
}
