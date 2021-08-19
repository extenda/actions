const os = require('os');
const path = require('path');
const core = require('@actions/core');
const cache = require('@actions/cache');
const fg = require('fast-glob');
const { promisify } = require('util');
const rmdir = promisify(require('fs').rmdir);
const unlink = promisify(require('fs').unlink);

const REPO = path.join(os.homedir(), '.m2', 'repository');
const RESTORED_TIME = 'maven.RestoredTime';
const RESTORED_KEY = 'maven.RestoredKey';

const withCacheKey = async (fn) => {
  const cacheKey = core.getInput('cache-key') || '';
  return cacheKey ? fn(cacheKey) : null;
};

const saveCache = async () => withCacheKey((key) => {
  const restoredKey = core.getState(RESTORED_KEY);
  const restoredTime = Number(core.getState(RESTORED_TIME));

  // Pattern used to remove all lastUpdated markers to always attempt a new
  // resolution on a build. This ensures we always pull snapshots.
  const patterns = ['**/*.lastUpdated'];

  if (restoredKey !== key) {
    // If this isn't a perfect cache hit, we want to remove
    // unused dependencies from our cache.
    patterns.push('**/*.pom');
  }

  return fg(patterns, { cwd: REPO, objectMode: true, stats: true })
    .then((entries) => Promise.all(entries.map((e) => {
      if (e.name.endsWith('.lastUpdated')) {
        const fqn = path.join(REPO, e.path);
        core.debug(`Remove: ${fqn}`);
        return unlink(fqn);
      }
      if (e.stats.atimeMs < restoredTime) {
        const fqn = path.dirname(path.join(REPO, e.path));
        core.debug(`Remove: ${fqn}`);
        return rmdir(fqn, { recursive: true });
      }
      return Promise.resolve();
    }))).then(() => cache.saveCache([REPO], key));
});

const restoreCache = async () => withCacheKey((key) => {
  const restoreKeys = (core.getInput('cache-restore-keys') || key).split(/\s+/);
  return cache.restoreCache([REPO], key, restoreKeys)
    .then((restoreKey) => {
      core.saveState(RESTORED_KEY, restoreKey);
      core.saveState(RESTORED_TIME, `${Date.now()}`);
      return restoreKey;
    });
});

module.exports = {
  saveCache,
  restoreCache,
};
