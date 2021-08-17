const os = require('os');
const path = require('path');
const core = require('@actions/core');
const cache = require('@actions/cache');

const paths = [
  path.join(os.homedir(), '.m2', 'repository'),
];

const withCacheKey = async (fn) => {
  const cacheKey = core.getInput('cache-key') || '';
  return cacheKey ? fn(cacheKey) : null;
};

const saveCache = async () => withCacheKey((key) => cache.saveCache(paths, key));

const restoreCache = async () => withCacheKey((key) => {
  const restoreKeys = (core.getInput('cache-restore-keys') || key).split(/\s+/);
  return cache.restoreCache(paths, key, restoreKeys);
});

module.exports = {
  saveCache,
  restoreCache,
};
