import fs from 'node:fs';
import path from 'node:path';

import { LANG_TAG, TRANSLATION_FILE } from './constants.js';

export function loadTranslations(dir) {
  const file = path.join(dir, TRANSLATION_FILE);
  if (!fs.existsSync(file)) {
    throw new Error(
      `Translation file not found: ${file}. The default layer only accepts ${LANG_TAG}, so the path must contain the file ${TRANSLATION_FILE}.`,
    );
  }

  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!isPlainObject(parsed)) {
    throw new Error(
      `Invalid translation file ${file}: expected a JSON object of translation entries`,
    );
  }

  const entries = isWrapped(parsed) ? parsed.entries : parsed;
  if (Object.keys(entries).length === 0) {
    throw new Error(
      `Invalid translation file ${file}: no translation entries found`,
    );
  }

  return { file, entries };
}

// A flat file may hold a translation key named `entries` of its own, so a wrapped publish body
// is only one whose sole key is `entries` and whose values are all translation entries.
function isWrapped(parsed) {
  const keys = Object.keys(parsed);
  if (
    keys.length !== 1 ||
    keys[0] !== 'entries' ||
    !isPlainObject(parsed.entries)
  ) {
    return false;
  }

  return Object.values(parsed.entries).every(isEntry);
}

function isEntry(entry) {
  return isPlainObject(entry) && typeof entry.value === 'string';
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
