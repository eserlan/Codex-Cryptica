import { execFileSync } from 'child_process';
import { readdirSync } from 'fs';
import { join } from 'path';

const BUCKET = 'codex-cryptica-statics';
const LOCAL_DIR = 'apps/web/static/blog/assets/064';
const REMOTE_PREFIX = 'blog/assets/064';

const files = readdirSync(LOCAL_DIR).filter(file => file.endsWith('.png'));

for (const file of files) {
  const localPath = join(LOCAL_DIR, file);
  const remotePath = `${REMOTE_PREFIX}/${file}`;
  
  console.log(`Uploading ${file} to ${remotePath}...`);
  try {
    execFileSync('npx', [
      'wrangler',
      'r2',
      'object',
      'put',
      `${BUCKET}/${remotePath}`,
      '--file',
      localPath,
      '--remote'
    ], { stdio: 'inherit' });
  } catch (error) {
    console.error(`Failed to upload ${file}:`, error);
  }
}

console.log('All 064 blog assets uploaded successfully!');
