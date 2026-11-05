import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'dist');

// Publish only browser files; keep SQL, server code, and tooling private.
await rm(output, { recursive: true, force: true });
await mkdir(path.join(output, 'js'), { recursive: true });
await mkdir(path.join(output, 'css'), { recursive: true });
await mkdir(path.join(output, 'assets'), { recursive: true });
await cp(path.join(root, 'index.html'), path.join(output, 'index.html'));

for (const entry of await readdir(root, { withFileTypes: true })) {
  if (!entry.isFile()) continue;
  const directory = entry.name.endsWith('.js') ? 'js'
    : entry.name.endsWith('.css') ? 'css' : null;
  if (directory) {
    await cp(path.join(root, entry.name), path.join(output, directory, entry.name));
  }
}

// Optional photos may be supplied in assets; required bundled files follow.
try {
  await cp(path.join(root, 'assets'), path.join(output, 'assets'), { recursive: true });
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
for (const directory of ['vendor', 'fonts']) {
  await cp(path.join(root, directory), path.join(output, 'assets', directory), {
    recursive: true,
  });
}

console.log('Prepared static site in dist.');
