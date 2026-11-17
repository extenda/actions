const CHANGES = 'openspec/changes/';
const CONCURRENCY = 10;

// Runs fn on the items in batches of limit; the results keep the order of the items.
const mapLimit = async (items, limit, fn) => {
  const batches = [];
  for (let i = 0; i < items.length; i += limit) {
    batches.push(items.slice(i, i + limit));
  }
  const results = [];
  let previous = Promise.resolve();
  const runs = batches.map((batch) => {
    previous = previous.then(() => Promise.all(batch.map(fn)));
    return previous;
  });
  for (const run of runs) {
    results.push(...(await run));
  }
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
