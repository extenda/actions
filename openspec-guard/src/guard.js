import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  checkTasks,
  DEFAULT_MAX_TASKS,
  hasUnticked,
  headingKey,
  isGroupHeading,
  ticksOnly,
} from './tasks-md.js';

const OPENSPEC_DIRS = ['openspec', '.openspec-store'];
const ARCHIVE_DATE = String.raw`\d{4}-\d{2}-\d{2}`;
const MAX_BUFFER = 256 * 1024 * 1024;

class GuardError extends Error {}

const die = (message) => {
  throw new GuardError(message);
};

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

/**
 * Keeps an approved OpenSpec change as approved. Once a change is on the base branch (its proposal PR merged)
 * its proposal, design and spec deltas are frozen and its tasks.md may only get boxes ticked.
 * openspec/specs/ and openspec/changes/archive/ change only on chore/archive-<change> branches, and only for
 * that change. There an archive PR must equal `openspec archive <change>` run on the base, apart from ticks in
 * the archived tasks.md, and every archived task must be ticked.
 * A change that is not on the base yet gets its tasks.md groups and spec names checked.
 *
 * Throws when it cannot run (unresolvable base, git error); a pass is never silent about that.
 *
 * @param {object} options
 * @param {string} options.cwd the git work tree
 * @param {string} options.base the base ref, e.g. origin/master
 * @param {string} options.branch the head branch name
 * @param {boolean} [options.draft] true while the PR is a draft; lets task groups say (TBD)
 * @param {string[]} [options.openspecCommand] the OpenSpec CLI command, needed on archive branches
 * @param {string} [options.storeId] the store id; default the `id:` of .openspec-store/store.yaml on the base
 * @param {string} [options.clanPrefix] a spec name prefix of the clan, e.g. cardpayment-
 * @param {string} [options.servicesFile] the clan service list on the base
 * @param {string} [options.servicesHeading] the heading of the bullets in servicesFile that list the services
 * @param {number} [options.maxTasks] tasks per group
 * @param {string} [options.gitBin] the git executable, default git from the PATH
 * @returns {{failures: {file: string, message: string}[], skipped: boolean}}
 */
const runGuard = ({
  cwd,
  base,
  branch,
  draft = false,
  openspecCommand = [],
  storeId = '',
  clanPrefix = '',
  servicesFile = '.agent/discovered.md',
  servicesHeading = 'Other services in this clan',
  maxTasks = DEFAULT_MAX_TASKS,
  gitBin = 'git',
}) => {
  const failures = [];
  const fail = (file, message) => failures.push({ file, message });

  const run = (cmd, args, opts = {}) =>
    execFileSync(cmd, args, {
      cwd,
      encoding: 'utf8',
      maxBuffer: MAX_BUFFER,
      stdio: ['ignore', 'pipe', 'pipe'],
      ...opts,
    });
  const git = (args, opts) =>
    run(gitBin, ['-c', 'core.quotePath=false', ...args], opts);
  const gitOrDie = (args, opts) => {
    try {
      return git(args, opts);
    } catch {
      return die(`git ${args[0]} failed.`);
    }
  };
  const gitShow = (spec) => {
    try {
      return git(['show', spec]);
    } catch {
      return null;
    }
  };
  const gitOk = (args) => {
    try {
      git(args);
      return true;
    } catch {
      return false;
    }
  };

  // NUL separated `git diff --name-status` output as [status, path] pairs.
  const nameStatus = (args) => {
    const parts = gitOrDie([
      'diff',
      '-z',
      '--name-status',
      '--no-renames',
      ...args,
    ]).split('\0');
    const entries = [];
    for (let i = 0; i + 1 < parts.length; i += 2) {
      entries.push([parts[i], parts[i + 1]]);
    }
    return entries;
  };

  // True when change $1 is on the base branch, i.e. its proposal was approved.
  const approvedCache = new Map();
  const approved = (change) => {
    if (!approvedCache.has(change)) {
      approvedCache.set(
        change,
        gitOk(['cat-file', '-e', `${base}:openspec/changes/${change}`]),
      );
    }
    return approvedCache.get(change);
  };

  const archiving = (branchName) => {
    const prefix = 'chore/archive-';
    return branchName.startsWith(prefix) ? branchName.slice(prefix.length) : '';
  };

  // free | ticks (tasks.md of an approved change) | frozen | archive (archive branches only)
  const kind = (p) => {
    if (
      p.startsWith('openspec/specs/') ||
      p.startsWith('openspec/changes/archive/')
    ) {
      return 'archive';
    }
    if (/^openspec\/changes\/[^/]+\/./.test(p)) {
      const change = p.slice('openspec/changes/'.length).split('/')[0];
      if (!approved(change)) {
        return 'free';
      }
      return path.posix.basename(p) === 'tasks.md' ? 'ticks' : 'frozen';
    }
    return 'free';
  };

  const readWork = (p) => fs.readFileSync(path.join(cwd, p), 'utf8');

  // Everything under openspec/ and .openspec-store/ must be a regular file: no symlinks, no submodules.
  const checkModes = () => {
    const entries = gitOrDie([
      'ls-tree',
      '-r',
      '-z',
      'HEAD',
      '--',
      ...OPENSPEC_DIRS,
    ])
      .split('\0')
      .filter(Boolean);
    for (const entry of entries) {
      const mode = entry.split(' ')[0];
      const p = entry.slice(entry.indexOf('\t') + 1);
      if (mode !== '100644' && mode !== '100755') {
        fail(p, `Only regular files are allowed here (mode ${mode}).`);
      }
    }
  };

  let services = null;
  // The bullets under the services heading in the service list on the base, never the PR's copy, which a PR
  // could widen.
  const loadServices = () => {
    if (services) {
      return services;
    }
    const text = gitShow(`${base}:${servicesFile}`);
    if (text === null) {
      die(`No ${servicesFile} on ${base}; cannot check spec names.`);
    }
    const list = [];
    let on = false;
    for (const line of text.split('\n')) {
      if (line.startsWith('### ')) {
        on = line.includes(servicesHeading);
      } else if (on) {
        const m = /^- ([a-z0-9-]+)\s*$/.exec(line);
        if (m) {
          list.push(m[1]);
        }
      }
    }
    if (list.length === 0) {
      die(
        `No services found in ${servicesFile} on ${base}; cannot check spec names.`,
      );
    }
    services = list;
    return services;
  };

  const resolveStoreId = () => {
    if (storeId) {
      return storeId;
    }
    const text = gitShow(`${base}:.openspec-store/store.yaml`) ?? '';
    const line = text.split('\n').find((l) => l.startsWith('id:'));
    return line ? line.slice('id:'.length).trim() : '';
  };

  // Capability folders of an unapproved change start with a service of the clan or the clan prefix; the store
  // id is not a prefix of its own (hiiconnect-router is a service, hiiconnect-refunds is not).
  const checkSpecNames = (dir) => {
    const list = loadServices();
    const id = resolveStoreId();
    const names = fs
      .readdirSync(path.join(cwd, dir), { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort((a, b) => a.localeCompare(b));
    const servicePrefixes = list.filter((s) => s !== id).map((s) => `${s}-`);
    const startsWith = (name, prefixes) =>
      prefixes.some((x) => name.startsWith(x) && name.length > x.length);
    for (const name of names) {
      const bare = list.includes(name); // a bare service name is not a capability name
      // The store id is never a prefix of its own, whatever the clan prefix says; only a service of the clan
      // that starts with it (hiiconnect-router) admits a name.
      const idName = id !== '' && (name === id || name.startsWith(`${id}-`));
      const ok =
        !bare &&
        (startsWith(name, servicePrefixes) ||
          (!idName && clanPrefix !== '' && startsWith(name, [clanPrefix])));
      if (!ok) {
        const orPrefix = clanPrefix ? ` or ${clanPrefix}` : '';
        const notId = id ? ` (never the store id ${id})` : '';
        fail(
          `${dir}/${name}`,
          `Spec name must start with a service of this clan${orPrefix}${notId}.`,
        );
      }
    }
  };

  let storeKeys = null;
  // The Jira keys of the group headings of every tasks.md on the base, open and archived changes, as
  // upper-case key -> the tasks.md that uses it.
  const loadStoreKeys = () => {
    if (storeKeys) {
      return storeKeys;
    }
    storeKeys = new Map();
    let out = '';
    try {
      out = git([
        'grep',
        '-z',
        '-I',
        '-e',
        '^## ',
        base,
        '--',
        ':(glob)openspec/changes/**/tasks.md',
      ]);
    } catch (err) {
      if (err.status !== 1) {
        die('git grep failed.');
      }
    }
    for (const entry of out.split('\n')) {
      const nul = entry.indexOf('\0');
      const file = entry.slice(0, nul);
      const heading = entry.slice(nul + 1).trimEnd();
      if (nul > 0 && file.startsWith(`${base}:`) && isGroupHeading(heading)) {
        const key = headingKey(heading).toUpperCase();
        if (key !== 'TBD' && !storeKeys.has(key)) {
          storeKeys.set(key, file.slice(base.length + 1));
        }
      }
    }
    return storeKeys;
  };

  // tasks.md and spec names of a change that is not on the base yet.
  const checkNewChange = (change) => {
    const tasksFile = `openspec/changes/${change}/tasks.md`;
    if (fs.existsSync(path.join(cwd, tasksFile))) {
      for (const { line, message } of checkTasks(readWork(tasksFile), {
        draft,
        maxTasks,
        usedKeys: loadStoreKeys(),
      })) {
        fail(tasksFile, line ? `${line}: ${message}` : message);
      }
    }
    const specs = `openspec/changes/${change}/specs`;
    const specsPath = path.join(cwd, specs);
    if (fs.existsSync(specsPath) && fs.statSync(specsPath).isDirectory()) {
      checkSpecNames(specs);
    }
  };

  // Changed changes that are not on the base yet get the tasks.md and spec name checks.
  const checkChanges = (entries) => {
    const changes = new Set();
    for (const [, p] of entries) {
      if (
        !p.startsWith('openspec/changes/archive/') &&
        /^openspec\/changes\/[^/]+\/./.test(p)
      ) {
        changes.add(p.slice('openspec/changes/'.length).split('/')[0]);
      }
    }
    for (const change of changes) {
      if (!approved(change)) {
        checkNewChange(change);
      }
    }
  };

  // Every changed openspec file on a non-archive branch must follow kind().
  const checkDiff = () => {
    const entries = nameStatus([`${base}...HEAD`, '--', 'openspec']);
    for (const [st, p] of entries) {
      if (p.startsWith('"')) {
        fail(p, 'Quoted path; refusing to guess what it is.');
        continue;
      }
      if (st === 'T') {
        fail(p, 'File type changes are not allowed.');
        continue;
      }
      switch (kind(p)) {
        case 'archive':
          fail(
            p,
            'Only the chore/archive-<change> branch of its change may change this.',
          );
          break;
        case 'frozen':
          fail(
            p,
            'Approved change: proposal, design and spec deltas are frozen.',
          );
          break;
        case 'ticks': {
          const before = gitShow(`${base}:${p}`);
          if (!(
            st === 'M' &&
            before !== null &&
            ticksOnly(before, readWork(p))
          )) {
            fail(p, 'Approved change: tasks.md may only tick boxes.');
          }
          break;
        }
        default:
      }
    }
    checkChanges(entries);
  };

  // The folders openspec/changes/archive/<date>-<change> of a work tree that the base does not have yet.
  const newArchivedFolders = (root, change) => {
    const dir = path.join(root, 'openspec/changes/archive');
    if (!fs.existsSync(dir)) {
      return [];
    }
    const re = new RegExp(`^${ARCHIVE_DATE}-${escapeRegExp(change)}$`);
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && re.test(e.name))
      .map((e) => `openspec/changes/archive/${e.name}`)
      .filter((folder) => !gitOk(['cat-file', '-e', `${base}:${folder}`]))
      .sort((x, y) => x.localeCompare(y));
  };

  // Exactly one new archived folder, or a failure.
  const oneArchivedFolder = (root, change, none, side) => {
    const found = newArchivedFolders(root, change);
    if (found.length === 1) {
      return found[0];
    }
    fail(
      branch,
      found.length === 0
        ? none
        : `${change} has ${found.length} new archived folders ${side}: ${found.join(' ')}`,
    );
    return '';
  };

  const tail = (err) => {
    const out = `${err.stderr ?? ''}${err.stdout ?? ''}`.trim();
    return out ? `\n${out.slice(-1000)}` : '';
  };

  // Runs `openspec archive <change>` in the worktree t of the base. Returns the archived folders of the branch
  // and of the base, or null after a failure.
  const recomputeArchive = (change, t) => {
    const [cmd, ...args] = openspecCommand;
    try {
      run(cmd, [...args, 'archive', change, '--yes'], { cwd: t });
      run(cmd, [...args, 'validate', '--specs'], { cwd: t });
    } catch (err) {
      fail(branch, `openspec archive ${change} fails on ${base}.${tail(err)}`);
      return null;
    }
    let ignored;
    try {
      ignored = git(
        ['ls-files', '-o', '-i', '--exclude-standard', '--', ...OPENSPEC_DIRS],
        { cwd: t },
      )
        .split('\n')
        .filter(Boolean);
    } catch {
      return die('Cannot list ignored files.');
    }
    if (ignored.length > 0) {
      fail(
        branch,
        `openspec archive ${change} wrote files that .gitignore hides, so they cannot be compared: ${ignored.join(' ')}`,
      );
      return null;
    }
    const a = oneArchivedFolder(
      cwd,
      change,
      `No new archived folder for ${change}.`,
      'on the branch',
    );
    if (!a) {
      return null;
    }
    const r = oneArchivedFolder(
      t,
      change,
      `openspec archive ${change} on ${base} wrote no archived folder.`,
      `from openspec archive on ${base}`,
    );
    return r ? { a, r } : null;
  };

  // Re-runs `openspec archive <change>` on the base and requires the branch to match it.
  const checkArchive = (change, work) => {
    if (!approved(change)) {
      fail(branch, `${change} is not an open change on ${base}.`);
      return;
    }
    if (openspecCommand.length === 0) {
      die('The OpenSpec CLI command is required on an archive branch.');
    }
    const t = path.join(work, 'base');
    try {
      git(['worktree', 'add', '-q', '--detach', t, base]);
    } catch {
      fail(branch, `Cannot check out ${base}.`);
      return;
    }
    try {
      const folders = recomputeArchive(change, t);
      if (!folders) {
        return;
      }
      const { a, r } = folders;
      if (a !== r) {
        fs.renameSync(path.join(t, r), path.join(t, a)); // the archive date may differ
      }
      let tree;
      try {
        git(['add', '-A'], { cwd: t });
        tree = git(['write-tree'], { cwd: t }).trim();
      } catch {
        die('Cannot snapshot the archived base.');
      }
      const diff = nameStatus([tree, 'HEAD', '--', ...OPENSPEC_DIRS]);
      for (const [st, p] of diff) {
        const same =
          st === 'M' &&
          p === `${a}/tasks.md` &&
          ticksOnly(
            gitOrDie(['show', `${tree}:${p}`]),
            gitOrDie(['show', `HEAD:${p}`]),
          );
        if (!same) {
          fail(p, `Differs from openspec archive ${change}.`);
        }
      }
      const archivedTasks = `${a}/tasks.md`;
      if (
        fs.existsSync(path.join(cwd, archivedTasks)) &&
        hasUnticked(readWork(archivedTasks))
      ) {
        fail(archivedTasks, 'Archived with unticked tasks.');
      }
    } finally {
      try {
        git(['worktree', 'remove', '--force', t]);
      } catch {
        // The temp dir is removed by the caller.
      }
    }
  };

  // ---- Run

  if (
    !gitOk(['rev-parse', '-q', '--verify', `${base}^{commit}`]) ||
    !gitOk(['merge-base', base, 'HEAD'])
  ) {
    die(
      `Cannot resolve ${base}...HEAD (missing base ref or shallow clone; use fetch-depth: 0).`,
    );
  }
  try {
    git(['diff', '--quiet', `${base}...HEAD`, '--', ...OPENSPEC_DIRS]);
    return { failures, skipped: true };
  } catch (err) {
    if (err.status !== 1) {
      die('git diff failed.');
    }
  }

  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-guard-'));
  try {
    checkModes();
    const change = archiving(branch);
    if (change) {
      checkArchive(change, work);
    } else {
      checkDiff();
    }
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
  return { failures, skipped: false };
};

export { GuardError, runGuard };
