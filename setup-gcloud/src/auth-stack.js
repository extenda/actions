import fs from 'node:fs';
import path from 'node:path';

import { getJobScope } from './job-scope.js';

function authStackFilePath() {
  const jobScope = getJobScope();
  return path.join(jobScope, 'auth_stack.json');
}

export function loadAuthStack() {
  if (fs.existsSync(authStackFilePath())) {
    return JSON.parse(fs.readFileSync(authStackFilePath(), 'utf8'));
  }
  return [];
}

export function clearAuthStack() {
  if (fs.existsSync(authStackFilePath())) {
    fs.rmSync(authStackFilePath());
  }
}

export function updateAuthStack(authEntry) {
  const authStack = loadAuthStack();
  authStack.push(authEntry);
  fs.mkdirSync(path.dirname(authStackFilePath()), { recursive: true });
  fs.writeFileSync(authStackFilePath(), JSON.stringify(authStack), 'utf8');
}
