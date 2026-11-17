// Parsing shared by openspec-guard and openspec-spec-first: the OpenSpec task pattern, the group headings of
// tasks.md and the Jira key of a feat pull request title.

// Task lines as OpenSpec 2.0.0 counts them (task-progress.js): a -, * or + bullet or a numbered item (1. or 1)),
// then [ ], [x] or [], not followed by ( or [ (a link), except that [ ] followed by ( or [ still counts.
const BULLET = String.raw`^\s*(?:[-*+]|\d+[.)])\s*`;
const TASK_RE = new RegExp(
  String.raw`${BULLET}(?:\[\s*[^\]\s]?\s*\](?:[^(\[]|$)|\[\s+\])`,
);
const UNTICKED_RE = new RegExp(
  String.raw`${BULLET}(?:\[\s*\](?:[^(\[]|$)|\[\s+\])`,
);

// `## <n>. <repo>: <title> (<KEY>)`; <repo> is a bare GitHub repo name, only its shape is checked.
const GROUP_HEADING_RE = /^## \d+\. \w[\w.-]*: .+ \([A-Za-z0-9-]+\)\s*$/;
const JIRA_KEY_RE = /^[A-Z][A-Z0-9]*-\d+$/;

const DEFAULT_MAX_TASKS = 6;

const isGroupHeading = (line) => GROUP_HEADING_RE.test(line);
const isTask = (line) => TASK_RE.test(line);
const isUnticked = (line) => UNTICKED_RE.test(line);

// The lines of a text the way awk reads them: a final newline does not start another line.
const linesOf = (text) => {
  const lines = text.split('\n');
  if (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }
  return lines;
};

const hasUnticked = (text) => linesOf(text).some(isUnticked);

// True when newText differs from oldText only by task boxes going from [ ] to [x].
const ticksOnly = (oldText, newText) => {
  const o = linesOf(oldText);
  const n = linesOf(newText);
  if (o.length !== n.length) {
    return false;
  }
  return n.every((line, i) => {
    if (line === o[i]) {
      return true;
    }
    const ticked = o[i].replace(/\[\s*\]/, '[x]');
    const normalized = line.replace('[X]', '[x]');
    return isUnticked(o[i]) && ticked === normalized;
  });
};

// The text of the last parentheses of a group heading, e.g. `HICC-123` or `TBD`.
const headingKey = (heading) =>
  heading.replace(/\s*$/, '').replace(/^.*\(/, '').replace(/\)$/, '');

// The repo a group heading names: `## 1. my-repo: Title (HICC-1)` is `my-repo`.
const headingRepo = (heading) => heading.replace(/^## \S+ /, '').split(':')[0];

/**
 * Checks tasks.md of a change that is not approved yet: groups are `## <n>. <repo>: <title> (<KEY>)`, numbered
 * from 1, one repo each, at most maxTasks tasks. `(TBD)` stands in for the key only while the PR is a draft.
 * @returns {{line: number, message: string}[]} one entry per problem, line is 1-based
 */
const checkTasks = (
  text,
  { draft = false, maxTasks = DEFAULT_MAX_TASKS } = {},
) => {
  const problems = [];
  let groups = 0;
  let tasks = 0;
  let groupLine = 0;
  const flush = () => {
    if (tasks > maxTasks) {
      problems.push({
        line: groupLine,
        message: `group ${groups} has ${tasks} tasks (max ${maxTasks}).`,
      });
    }
  };

  linesOf(text).forEach((line, i) => {
    const lineNo = i + 1;
    if (/^##[^#]/.test(line)) {
      flush();
      tasks = 0;
      groupLine = lineNo;
      groups += 1;
      if (!GROUP_HEADING_RE.test(line)) {
        problems.push({
          line: lineNo,
          message: `heading must be \`## <n>. <repo>: <title> (<KEY>)\` with <repo> a bare GitHub repo name (no owner, no list): ${line}`,
        });
        return;
      }
      const number = Number(line.split(/[ .]/)[1]);
      if (number !== groups) {
        problems.push({
          line: lineNo,
          message: `group number ${line.split(/[ .]/)[1]} should be ${groups}.`,
        });
      }
      const key = headingKey(line);
      if (key === 'TBD') {
        if (!draft) {
          problems.push({
            line: lineNo,
            message: '(TBD) is only allowed while the PR is a draft.',
          });
        }
      } else if (!JIRA_KEY_RE.test(key)) {
        problems.push({ line: lineNo, message: `"${key}" is not a Jira key.` });
      }
    } else if (isTask(line)) {
      if (groups === 0) {
        problems.push({ line: lineNo, message: 'task outside a group.' });
      } else {
        tasks += 1;
      }
    }
  });
  flush();
  if (groups === 0) {
    problems.push({ line: 0, message: 'no group heading found.' });
  }
  return problems;
};

/**
 * The Jira key of a pull request title. Only a feat title needs a key, as its conventional commit scope:
 * `feat(HICC-123): ...` (case-insensitive, <project>-<number>).
 * @returns {{status: 'skip'} | {status: 'missing'} | {status: 'key', key: string}}
 */
const keyFromTitle = (title) => {
  const match = /^feat(\(([^)]*)\))?!?:/.exec(
    String(title ?? '').toLowerCase(),
  );
  if (!match) {
    return { status: 'skip' };
  }
  const scope = match[2] ?? '';
  if (!/^[a-z][a-z0-9]*-\d+$/.test(scope)) {
    return { status: 'missing' };
  }
  return { status: 'key', key: scope.toUpperCase() };
};

export {
  checkTasks,
  DEFAULT_MAX_TASKS,
  hasUnticked,
  headingKey,
  headingRepo,
  isGroupHeading,
  isTask,
  isUnticked,
  keyFromTitle,
  ticksOnly,
};
