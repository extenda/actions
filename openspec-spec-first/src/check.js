import {
  headingKey,
  headingRepo,
  isGroupHeading,
} from '../../openspec-guard/src/tasks-md.js';

/**
 * The key must be the key of exactly one group heading `## <n>. <repo>: <title> (<KEY>)` in a tasks.md of the
 * store (open or archived). The heading's repo is a cross-check only: when it differs from repo (the name of
 * the repository of the pull request) there is a warning and the check still passes.
 * @param {{path: string, content: string}[]} files the tasks.md files of the store
 * @param {string} key the Jira key, any case
 * @param {string} repo the repo name of the pull request
 */
const checkKey = (files, key, repo) => {
  const wanted = key.toLowerCase();
  const keyUpper = key.toUpperCase();
  const hits = [];
  for (const file of files) {
    for (const line of file.content.split('\n')) {
      const heading = line.trimEnd();
      if (isGroupHeading(heading)) {
        if (headingKey(heading).toLowerCase() === wanted) {
          hits.push({ path: file.path, heading });
        }
      }
    }
  }

  if (hits.length === 0) {
    return {
      ok: false,
      warnings: [],
      errors: [
        `No change in the store has a group '## <n>. <repo>: <title> (${keyUpper})'. Propose and merge the change in the store first.`,
      ],
    };
  }
  if (hits.length > 1) {
    return {
      ok: false,
      warnings: [],
      errors: [
        `Key ${keyUpper} is in ${hits.length} group headings; a key must name exactly one group:`,
        ...hits.map((h) => `${h.path}: ${h.heading}`),
      ],
    };
  }

  const [hit] = hits;
  const warnings = [];
  const name = headingRepo(hit.heading);
  if (name !== repo) {
    warnings.push(`The group heading names '${name}', this repo is '${repo}'.`);
  }
  return {
    ok: true,
    warnings,
    errors: [],
    message: `Spec first: ${keyUpper} is covered by ${hit.path}: ${hit.heading}`,
  };
};

export { checkKey };
