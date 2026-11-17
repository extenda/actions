const CHANGES = 'openspec/changes/';

// Blobs read by one GraphQL call; the API takes up to 100 aliased objects of a query without hitting its
// node limit.
const BATCH = 100;

const blobQuery = (n) => {
  const vars = Array.from({ length: n }, (_, i) => `$o${i}: GitObjectID!`);
  const fields = Array.from(
    { length: n },
    (_, i) => `b${i}: object(oid: $o${i}) { ... on Blob { text isTruncated } }`,
  );
  return `query($owner: String!, $repo: String!, ${vars.join(', ')}) {
  repository(owner: $owner, name: $repo) { ${fields.join('\n    ')} }
}`;
};

// The text of the blobs in one request. A GraphQL error, a missing blob, a binary or a truncated one throws:
// a partial read must never pass the check.
const readBlobs = async (octokit, owner, repo, entries) => {
  const variables = { owner, repo };
  entries.forEach((e, i) => {
    variables[`o${i}`] = e.sha;
  });
  const data = await octokit.graphql(blobQuery(entries.length), variables);
  return entries.map((e, i) => {
    const blob = data?.repository?.[`b${i}`];
    if (!blob || typeof blob.text !== 'string' || blob.isTruncated) {
      throw new Error(
        `Cannot read ${e.path} completely from ${owner}/${repo}.`,
      );
    }
    return { path: e.path, content: blob.text };
  });
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
  const files = [];
  for (let i = 0; i < tasks.length; i += BATCH) {
    // Sequential on purpose: one GraphQL batch at a time keeps within the API rate budget.
    files.push(
      ...(await readBlobs(octokit, owner, repo, tasks.slice(i, i + BATCH))),
    );
  }
  return files;
};

export { loadTasksFiles };
