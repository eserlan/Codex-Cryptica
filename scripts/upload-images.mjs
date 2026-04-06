import { execSync } from 'child_process';
import { readdirSync } from 'fs';
import { join } from 'path';

const BUCKET = 'codex-cryptica-statics';
const LOCAL_DIR = 'apps/web/static/vault-samples/images';
const REMOTE_PREFIX = 'vault-samples/images';

const files = readdirSync(LOCAL_DIR);

for (const file of files) {
  const localPath = join(LOCAL_DIR, file);
  const remotePath = `${REMOTE_PREFIX}/${file}`;
  
  console.log(`Uploading ${file} to ${remotePath}...`);
  try {
    execSync(`npx wrangler r2 object put ${BUCKET}/${remotePath} --file ${localPath} --remote`, { stdio: 'inherit' });
  } catch (error) {
    console.error(`Failed to upload ${file}:`, error);
  }
}

console.log('All images uploaded successfully!');
