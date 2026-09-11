import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = process.cwd();
const webPackagePath = resolve(repoRoot, 'apps/web/package.json');
const configPath = resolve(repoRoot, 'apps/web/src/lib/config/index.ts');
const serviceWorkerPath = resolve(repoRoot, 'apps/web/src/service-worker.ts');

export function calculateNextVersion(currentVersion, bumpType, topChangelogVersion = null) {
  const versionMatch = /^(\d+)\.(\d+)\.(\d+)$/.exec(currentVersion);
  if (!versionMatch) {
    throw new Error(`Unsupported version format: ${currentVersion}`);
  }

  let [, major, minor, patch] = versionMatch.map(Number);

  if (bumpType === 'major') {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (bumpType === 'minor') {
    minor += 1;
    patch = 0;
  } else {
    patch += 1;
  }

  let nextVersion = `${major}.${minor}.${patch}`;

  if (topChangelogVersion) {
    const parseSemver = (v) => {
      const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(v);
      return m ? m.slice(1, 4).map(Number) : [0, 0, 0];
    };
    const [n1, n2, n3] = parseSemver(nextVersion);
    const [c1, c2, c3] = parseSemver(topChangelogVersion);
    const cmp = c1 !== n1 ? c1 - n1 : c2 !== n2 ? c2 - n2 : c3 - n3;
    if (cmp > 0) {
      nextVersion = topChangelogVersion;
    }
  }

  return nextVersion;
}

async function run() {
  const pkg = JSON.parse(readFileSync(webPackagePath, 'utf8'));
  const version = pkg.version;

  // Determine bump type
  let bumpType = 'patch';
  const prNumber = process.env.PR_NUMBER;
  const githubRepo = process.env.GITHUB_REPOSITORY;
  const ghToken = process.env.GH_TOKEN;

  if (prNumber && githubRepo && ghToken) {
    try {
      const response = await fetch(`https://api.github.com/repos/${githubRepo}/pulls/${prNumber}`, {
        headers: {
          'Authorization': `token ${ghToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'node-fetch'
        }
      });
      
      if (response.ok) {
        const prData = await response.json();
        const labels = prData.labels.map(l => l.name.toLowerCase());
        if (labels.includes('major')) {
          bumpType = 'major';
        } else if (labels.includes('minor')) {
          bumpType = 'minor';
        }
      } else {
        console.warn(`Failed to fetch PR data: ${response.status} ${response.statusText}`);
      }
    } catch (e) {
      console.warn(`Error fetching PR labels for #${prNumber}:`, e.message);
    }
  }

  const changelogPath = resolve(repoRoot, 'apps/web/src/lib/content/changelog/releases.json');
  let topChangelogVersion = null;
  try {
    const changelog = JSON.parse(readFileSync(changelogPath, 'utf8'));
    if (Array.isArray(changelog) && changelog.length > 0 && changelog[0].version) {
      topChangelogVersion = changelog[0].version;
    }
  } catch (e) {
    console.warn('Could not read releases.json for version syncing:', e.message);
  }

  const nextVersion = calculateNextVersion(version, bumpType, topChangelogVersion);

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

  console.log(`Bumped web version ${version} -> ${nextVersion} (${bumpType})`);
  console.log(`Bumped SW cache version ${swMatch[1]} -> ${nextCacheVersion}`);
}

import { pathToFileURL } from 'node:url';

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  run().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
