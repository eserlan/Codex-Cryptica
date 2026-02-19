import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = process.cwd();
const webPackagePath = resolve(repoRoot, 'apps/web/package.json');
const configPath = resolve(repoRoot, 'apps/web/src/lib/config/index.ts');
const serviceWorkerPath = resolve(repoRoot, 'apps/web/src/service-worker.ts');

const pkg = JSON.parse(readFileSync(webPackagePath, 'utf8'));
const version = pkg.version;

const versionMatch = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
if (!versionMatch) {
  throw new Error(`Unsupported version format: ${version}`);
}

const [, major, minor, patch] = versionMatch;
const nextVersion = `${major}.${minor}.${Number(patch) + 1}`;
pkg.version = nextVersion;
writeFileSync(webPackagePath, `${JSON.stringify(pkg, null, 2)}\n`);

const config = readFileSync(configPath, 'utf8');
const configRegex = /versionFromBuild \?\? "\d+\.\d+\.\d+"/;

if (!configRegex.test(config)) {
  throw new Error('Could not find VERSION fallback pattern in apps/web/src/lib/config/index.ts');
}

const updatedConfig = config.replace(
  configRegex,
  `versionFromBuild ?? "${nextVersion}"`,
);

if (updatedConfig !== config) {
  writeFileSync(configPath, updatedConfig);
}

const sw = readFileSync(serviceWorkerPath, 'utf8');
const swMatch = /const CACHE_VERSION = "(\d+)";/.exec(sw);
if (!swMatch) {
  throw new Error('Failed to find CACHE_VERSION in apps/web/src/service-worker.ts');
}
const nextCacheVersion = String(Number(swMatch[1]) + 1);
const updatedSw = sw.replace(
  /const CACHE_VERSION = "\d+";/,
  `const CACHE_VERSION = "${nextCacheVersion}";`,
);
writeFileSync(serviceWorkerPath, updatedSw);

console.log(`Bumped web version ${version} -> ${nextVersion}`);
console.log(`Bumped SW cache version ${swMatch[1]} -> ${nextCacheVersion}`);
