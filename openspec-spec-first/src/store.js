const CHANGES = 'openspec/changes/';
const CONCURRENCY = 10;

const mapLimit = async (items, limit, fn) => {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next;
      next += 1;
      results[i] = await fn(items[i]);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
  return results;
};

/**
 * Reads every tasks.md under openspec/changes/ (archived changes included) of a store repo through the GitHub
 * API, without a checkout.
 * @param octokit an Octokit with a token that can read the contents of the store
 * @param {string} storeRepo the store as owner/name
 * @param {string} [ref] branch, tag or SHA; default the default branch of the store
 * @returns {Promise<{path: string, content: string}[]>}
 */
const loadTasksFiles = async (octokit, storeRepo, ref) => {
  const [owner, repo, ...rest] = String(storeRepo ?? '').split('/');
  if (!owner || !repo || rest.length > 0) {
    throw new Error(
      `The store must be given as owner/name, got '${storeRepo}'.`,
    );
  }

  const treeSha =
    ref || (await octokit.rest.repos.get({ owner, repo })).data.default_branch;
  const { data } = await octokit.rest.git.getTree({
    owner,
    repo,
    tree_sha: treeSha,
    recursive: 'true',
  });
  if (data.truncated) {
    throw new Error(
      `The tree of ${storeRepo} is truncated by the GitHub API; cannot read all changes.`,
    );
  }
  if (!data.tree.some((e) => e.path.startsWith(CHANGES))) {
    throw new Error(`No openspec/changes in ${storeRepo}.`);
  }

  const tasks = data.tree.filter(
    (e) =>
      e.type === 'blob' &&
      e.path.startsWith(CHANGES) &&
      e.path.split('/').pop() === 'tasks.md',
  );
  return mapLimit(tasks, CONCURRENCY, async (e) => {
    const { data: blob } = await octokit.rest.git.getBlob({
      owner,
      repo,
      file_sha: e.sha,
    });
    return {
      path: e.path,
      content: Buffer.from(blob.content, blob.encoding).toString('utf8'),
    };
  });
};

export { loadTasksFiles };
