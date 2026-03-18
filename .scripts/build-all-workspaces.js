import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildWorkspace } from './build-workspace.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const { workspaces } = JSON.parse(
  fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'),
);

console.time('build all workspaces');
await Promise.all(
  workspaces.map((workspace) => buildWorkspace(path.join(rootDir, workspace))),
);
console.timeEnd('build all workspaces');
