import path from 'node:path';

import * as core from '@actions/core';
import * as exec from '@actions/exec';
import { load as parseYaml } from 'js-yaml';
import pLimit from 'p-limit';

// Checks that destroyed resources are no longer used by any configuration.
// The checks only read from GitHub and report warnings, they never fail the
// action.

const DEPLOY_FILE = 'cloud-deploy.yaml';
// Mentions in documentation are reported, but don't count as usage.
const DOC_EXTENSIONS = new Set(['.md', '.mdx', '.rst', '.adoc', '.txt']);
const MAX_FILES = 50;
// Files found with code search are read to find the matching lines.
const MAX_PARALLEL_READS = 5;

const WARN = ':warning:';
const INFO = ':information_source:';
const UNKNOWN = ':grey_question:';
// A reference still in the code after the pull request.
const NOT_REMOVED = 'still referenced here. Forgotten?';

// The rows of a group, in order.
const KINDS = [
  ['service', 'Service'],
  ['repository', 'Repository'],
  ['dns', 'DNS'],
  ['sa', 'Service account'],
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

/**
 * Matches a name as a whole word, e.g. a domain but not its sub-domains.
 */
const refPattern = (name) =>
  new RegExp(
    String.raw`(?<![A-Za-z0-9._-])${escapeRegExp(name)}(?!\.?[A-Za-z0-9_-])`,
    'i',
  );

// Lines that start a comment, e.g. `// ...`, ` * ...`, `# ...` or `<!-- ...`.
// Markers that also start code, like `--flag`, are left out: missing a comment
// only gives an extra warning.
const COMMENT_LINE = /^\s*(\/\/|\/\*|\*(\s|\/|$)|#|<!--)/;

/**
 * Find the lines of a text that reference a name.
 * @returns {{lines: number[], kind: 'code'|'comment'}|null} the line numbers,
 * and 'comment' if the name is only found in comment lines
 */
const findLines = (text, pattern) => {
  const matches = text
    .split('\n')
    .map((line, i) => ({ line, number: i + 1 }))
    .filter(({ line }) => pattern.test(line));
  if (matches.length === 0) {
    return null;
  }
  return {
    lines: matches.map(({ number }) => number),
    kind: matches.every(({ line }) => COMMENT_LINE.test(line))
      ? 'comment'
      : 'code',
  };
};

const isDoc = (file) => DOC_EXTENSIONS.has(path.extname(file).toLowerCase());

const plural = (n, word, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;

const gitOutput = async (args) => {
  let stdout = '';
  await exec.exec('git', args, {
    silent: true,
    ignoreReturnCode: true,
    listeners: {
      stdout: (data) => {
        stdout += data.toString('utf8');
      },
    },
  });
  return stdout;
};

/**
 * Check if the working directory is a checkout of the repository.
 */
const isCheckoutOf = async (repository) => {
  const url = (await gitOutput(['remote', 'get-url', 'origin'])).trim();
  return new RegExp(
    String.raw`[/:]${escapeRegExp(repository)}(\.git)?/?$`,
    'i',
  ).test(url);
};

const gitGrep = async (text) => {
  const stdout = await gitOutput([
    'grep',
    '-I',
    '-n',
    '-i',
    '-F',
    '-e',
    text,
    'HEAD',
    '--',
    ':/',
  ]);
  return stdout
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [, file, lineNumber, ...rest] = line.split(':');
      return { file, lineNumber: Number(lineNumber), text: rest.join(':') };
    });
};

class Resource {
  constructor(kind, name) {
    this.kind = kind;
    this.name = name;
    this.ownerRepos = new Set();
    // The removed repository the resource belongs to, if any.
    this.group = undefined;
    // {repo, file, url?, lines: number[], kind: 'code'|'comment'|'doc', note?}
    this.refs = [];
    // Code search found more files than it returned.
    this.truncated = false;
    // Why the resource could not be checked.
    this.failed = undefined;
    this.findings = [];
  }

  get title() {
    return Object.fromEntries(KINDS)[this.kind];
  }

  // A line replaces the default "<title> <name>: <text>" in the comment.
  add(level, text, line = undefined) {
    this.findings.push({ level, text, line });
  }

  get inUse() {
    return (
      this.refs.some(({ kind }) => kind === 'code') ||
      this.findings.some(({ level }) => level === WARN)
    );
  }
}

/**
 * Merge the references of resources by file.
 */
const mergeReferences = (resources) => {
  const files = new Map();
  for (const ref of resources.flatMap((r) => r.refs)) {
    const key = `${ref.repo}\0${ref.file}`;
    const known = files.get(key);
    if (!known) {
      files.set(key, { ...ref, lines: [...ref.lines] });
      continue;
    }
    known.lines = [...new Set([...known.lines, ...ref.lines])].sort(
      (a, b) => a - b,
    );
    known.url ??= ref.url;
    known.note ??= ref.note;
    if (
      ref.kind === 'code' ||
      (ref.kind === 'comment' && known.kind === 'doc')
    ) {
      known.kind = ref.kind;
    }
  }
  return [...files.values()];
};

const KIND_ORDER = { code: 0, comment: 1, doc: 2 };

const NOT_ABLE_TO_CHECK = 'not able to check, please check manually';

const escapeHtml = (s) =>
  s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const environmentPath = ({ repo, file }) =>
  repo === 'extenda/tf-infra-gcp'
    ? file.match(/^organization\/(.+)\/project\.yaml$/)?.[1]
    : undefined;

const belongsToEnvironment = (ref, environment) => {
  const projectEnvironment = environmentPath(ref);
  if (projectEnvironment) {
    return projectEnvironment === environment;
  }
  const segments = ref.file.split('/');
  const infraIndex = segments.indexOf('infra');
  return (
    infraIndex < 0 || segments[infraIndex + 1] === environment.split('/').at(-1)
  );
};

// The service a cloud-deploy.yaml deploys.
const deployService = (deploy) =>
  deploy?.['cloud-run']?.service ?? deploy?.kubernetes?.service;

// The files are listed in a <pre> block, like the plans, which can hold links.
const fileLine = ({ repo, file, url }) => {
  const label =
    url && repo === 'extenda/tf-infra-gcp' && file.startsWith('organization/')
      ? file.slice('organization/'.length)
      : `${repo}/${file}`;
  const name = escapeHtml(label);
  return url ? `<a href="${escapeHtml(url)}">${name}</a>` : name;
};

class DestroyedResources {
  /**
   * @param octokit authenticated GitHub client
   * @param options {{
   *   org: string,
   *   repository: string,
   *   pullRequestNumber: number|string,
   *   searchInterval?: number,
   *   fallbackToken?: boolean,
   * }}
   */
  constructor(octokit, options) {
    this.octokit = octokit;
    this.org = options.org;
    this.repository = options.repository;
    this.pullRequestNumber = options.pullRequestNumber;
    // GitHub code search allows 10 requests per minute.
    this.searchInterval = options.searchInterval ?? 6500;
    // Code search uses github-token, which may not see all repositories.
    this.fallbackToken = options.fallbackToken ?? false;
    this.lastSearch = 0;
    this.localCheckout = undefined;
    this.resources = new Map();
    // Removed repositories: {repo, services: string[]}
    this.groups = [];
    this.notes = [];
    this.incompleteRepositoryChecks = false;
    this.environments = new Set();
    // Shown before the resources.
    this.alerts = [];
    // Shown in its own section before the destroyed resources.
    this.behind = undefined;
    this.diff = undefined;
    this.files = new Map();
    this.limit = pLimit(MAX_PARALLEL_READS);
  }

  addResource(kind, name) {
    const key = `${kind}:${name.toLowerCase()}`;
    const known = this.resources.get(key);
    if (known) {
      return known;
    }
    const resource = new Resource(kind, name);
    this.resources.set(key, resource);
    return resource;
  }

  /**
   * Add a resource of a removed repository.
   */
  addOwned(kind, name, repo) {
    const resource = this.addResource(kind, name);
    resource.ownerRepos.add(repo);
    resource.group ??= repo;
    return resource;
  }

  /**
   * Collect destroyed resources from the plans.
   * @param outputs {{module: string, plan: string, output: string}[]}
   * @param showJson {function(string): Promise<object>}
   */
  async collect(outputs, showJson) {
    const secretRepos = { deleted: new Set(), kept: new Set() };
    let hasPlannedDestroy = false;
    for (const { module, plan, output } of outputs) {
      if (!/ [1-9]\d* to destroy/.test(output)) {
        continue;
      }
      hasPlannedDestroy = true;
      const environment = module.replace(/^organization\//, '');
      if (
        this.repository === 'extenda/tf-infra-gcp' &&
        /^[^/]+\/departments\/.+\/[^/]+$/.test(environment)
      ) {
        this.environments.add(environment);
      }
      let json;
      try {
        json = await showJson(plan);
      } catch (err) {
        this.notes.push(`${UNKNOWN} Could not read plan for ${module}.`);
        core.info(`Failed to show ${plan} as JSON: ${err.message}`);
        continue;
      }
      for (const change of json.resource_changes || []) {
        this.collectChange(change, secretRepos);
      }
    }
    // Secrets are removed when a repository is removed from a project. A
    // repository that keeps any secret only had some of its secrets removed.
    const removedRepos = [...secretRepos.deleted].filter(
      (repo) => !secretRepos.kept.has(repo),
    );
    for (const repo of removedRepos.sort((a, b) => a.localeCompare(b))) {
      await this.collectRepository(repo);
    }
    if (hasPlannedDestroy) {
      await this.collectRemovedProjectServices();
    }
    // Cloud Run services run as a service account named after the service.
    for (const resource of this.resources.values()) {
      if (resource.kind !== 'sa') {
        continue;
      }
      const account = resource.name.split('@')[0].toLowerCase();
      const group = this.groups.find(({ services }) =>
        services.some((s) => s.toLowerCase() === account),
      );
      if (group) {
        resource.ownerRepos.add(group.repo);
        resource.group ??= group.repo;
      }
    }
  }

  async collectRemovedProjectServices() {
    if (this.repository !== 'extenda/tf-infra-gcp') {
      return;
    }
    const { removedProjectServices } = await this.pullRequestDiff();
    for (const { name, environment } of removedProjectServices) {
      if (!this.environments.has(environment)) {
        continue;
      }
      const group = this.groups.find(({ services }) =>
        services.some(
          (service) => service.toLowerCase() === name.toLowerCase(),
        ),
      );
      if (group) {
        this.addOwned('service', name, group.repo);
        group.environments ??= new Set();
        group.environments.add(environment);
        continue;
      }

      const groupId = `project-service:${name.toLowerCase()}`;
      const resource = this.addResource('service', name);
      resource.group ??= groupId;
      const existing = this.groups.find(({ repo }) => repo === groupId);
      if (existing) {
        existing.environments.add(environment);
      } else {
        this.groups.push({
          repo: groupId,
          services: [name],
          environments: new Set([environment]),
        });
      }
    }
  }

  collectChange({ type, change }, secretRepos) {
    const actions = change?.actions || [];
    const deleted = actions.length === 1 && actions[0] === 'delete';
    if (type === 'github_actions_secret') {
      const repo = (change?.before || change?.after)?.repository;
      if (repo) {
        (deleted ? secretRepos.deleted : secretRepos.kept).add(repo);
      }
      return;
    }
    if (!deleted) {
      return;
    }
    const before = change.before || {};
    if (type === 'google_service_account' && before.email) {
      this.addResource('sa', before.email);
    } else if (type === 'google_dns_record_set' && before.name) {
      this.addResource('dns', before.name.replace(/\.$/, ''));
    }
  }

  async collectRepository(name) {
    const repo = name.includes('/') ? name : `${this.org}/${name}`;
    const repoName = repo.split('/')[1];
    const { deploys, error } = await this.readDeployFiles(repo);
    this.incompleteRepositoryChecks ||= Boolean(error);
    const services = deploys.map(({ service }) => service).filter(Boolean);

    // Deleted secrets alone don't prove that the service is removed. Only check
    // the repository if the pull request also removes its service.
    const names = [...new Set([repoName, ...services])];
    const removed = [];
    for (const n of names) {
      if (await this.removesService(n)) {
        removed.push(n);
      }
    }
    if (removed.length === 0) {
      if (error) {
        this.notes.push(
          `${UNKNOWN} Repository ${repo} could not be checked (${error}); service removal and DNS mappings may be incomplete.`,
        );
      } else {
        this.notes.push(
          `${INFO} Secrets for ${repo} are removed by this pull request, but its service ${names.join(', ')} is not, so it was not checked.`,
        );
      }
      return;
    }

    const group = { repo, services: [] };
    this.groups.push(group);
    if (error) {
      this.notes.push(
        `${UNKNOWN} Repository ${repo} is removed by this pull request, but could not be fully checked (${error}).`,
      );
    } else if (deploys.length === 0) {
      this.notes.push(
        `${INFO} Repository ${repo} is removed by this pull request. It has no ${DEPLOY_FILE}, so no DNS names were checked.`,
      );
    }
    for (const { file, deploy, service } of deploys) {
      if (!deploy) {
        this.notes.push(`${UNKNOWN} Could not read ${repo}/${file}.`);
        continue;
      }
      if (!removed.includes(service ?? repoName)) {
        // Another service in the same repository that is kept.
        continue;
      }
      if (service) {
        group.services.push(service);
        this.addOwned('service', service, repo);
      }
      for (const config of Object.values(deploy.environments || {})) {
        for (const host of config?.['domain-mappings'] || []) {
          this.addOwned('dns', String(host).replace(/\.$/, ''), repo);
        }
      }
    }
    // Nothing outside the removed repository may reference the repository.
    const lower = repoName.toLowerCase();
    if (!group.services.some((s) => s.toLowerCase() === lower)) {
      this.addOwned('repository', repoName, repo);
    }
  }

  /**
   * Read all cloud-deploy.yaml files of a repository.
   * @returns {{deploys: {file: string, deploy: object|null, service?: string}[], error?: string}}
   */
  async readDeployFiles(repo) {
    const [owner, repoName] = repo.split('/');
    let files;
    try {
      const { data } = await this.octokit.rest.git.getTree({
        owner,
        repo: repoName,
        tree_sha: 'HEAD',
        recursive: 'true',
      });
      if (data.truncated) {
        return { deploys: [], error: 'repository tree was truncated' };
      }
      files = data.tree
        .filter(
          (t) => t.type === 'blob' && path.basename(t.path) === DEPLOY_FILE,
        )
        .map((t) => t.path);
    } catch (err) {
      return { deploys: [], error: err.status || err.message };
    }
    const deploys = [];
    for (const file of files) {
      const deploy = await this.readDeployFile(repo, file);
      const service = deployService(deploy);
      deploys.push({ file, deploy, service });
    }
    return { deploys };
  }

  /**
   * Check if the pull request removes lines naming a service without adding
   * any. The plan alone can't tell: when the pull request is behind the base
   * branch, the plan also destroys what the base branch added since.
   */
  async removesService(name) {
    const pattern = refPattern(name);
    const { removed, added } = await this.pullRequestDiff();
    return (
      removed.some((line) => pattern.test(line)) &&
      !added.some((line) => pattern.test(line))
    );
  }

  async pullRequestDiff() {
    if (this.diff) {
      return this.diff;
    }
    this.diff = { removed: [], added: [], removedProjectServices: [] };
    const [owner, repo] = this.repository.split('/');
    try {
      const files = await this.octokit.paginate(
        this.octokit.rest.pulls.listFiles,
        { owner, repo, pull_number: this.pullRequestNumber, per_page: 100 },
      );
      const projectFiles = new Map();
      for (const {
        filename,
        previous_filename: previousFilename,
        patch,
        status,
      } of files) {
        const baseFile =
          status === 'renamed' && previousFilename
            ? previousFilename
            : filename;
        if (
          [filename, baseFile].some((file) =>
            /^organization\/.+\/project\.yaml$/.test(file || ''),
          )
        ) {
          projectFiles.set(filename, { baseFile, status });
        }
        for (const line of (patch || '').split('\n')) {
          if (line.startsWith('-')) {
            this.diff.removed.push(line.slice(1));
          } else if (line.startsWith('+')) {
            this.diff.added.push(line.slice(1));
          }
        }
      }
      if (projectFiles.size > 0) {
        const { data: pr } = await this.octokit.rest.pulls.get({
          owner,
          repo,
          pull_number: this.pullRequestNumber,
        });
        const { data: comparison } =
          await this.octokit.rest.repos.compareCommitsWithBasehead({
            owner,
            repo,
            basehead: `${pr.head.sha}...${pr.base.sha}`,
          });
        const mergeBase = comparison.merge_base_commit?.sha;
        if (!mergeBase) {
          throw new Error('Could not determine pull request merge base');
        }
        const removedByEnvironment = new Map();
        const newlyAdded = new Set();
        for (const [file, { baseFile, status }] of projectFiles) {
          const [before, after] = await Promise.all([
            this.readFile(this.repository, baseFile, mergeBase),
            this.readFile(
              this.repository,
              file,
              `refs/pull/${this.pullRequestNumber}/head`,
            ),
          ]);
          if (
            before.content === undefined &&
            !(status === 'added' && before.status === 404)
          ) {
            throw new Error(`Could not read base project file ${file}`);
          }
          if (
            after.content === undefined &&
            !(status === 'removed' && after.status === 404)
          ) {
            throw new Error(`Could not read changed project file ${file}`);
          }
          const serviceNames = (content) =>
            (content ? parseYaml(content)?.services || [] : [])
              .map((service) => service?.name)
              .filter((name) => typeof name === 'string')
              .map((name) => name.toLowerCase());
          const beforeNames = new Set(serviceNames(before.content || ''));
          const afterNames = new Set(serviceNames(after.content || ''));
          const environment = path
            .dirname(baseFile)
            .replace(/^organization\//, '');
          for (const name of beforeNames) {
            if (!afterNames.has(name)) {
              const environments = removedByEnvironment.get(name) || new Set();
              environments.add(environment);
              removedByEnvironment.set(name, environments);
            }
          }
          for (const name of afterNames) {
            if (!beforeNames.has(name)) {
              newlyAdded.add(name);
            }
          }
        }
        this.diff.removedProjectServices = [...removedByEnvironment]
          .filter(([name]) => !newlyAdded.has(name))
          .flatMap(([name, environments]) =>
            [...environments].map((environment) => ({ name, environment })),
          )
          .sort(
            (a, b) =>
              a.name.localeCompare(b.name) ||
              a.environment.localeCompare(b.environment),
          );
      }
    } catch (err) {
      this.notes.push(
        `${UNKNOWN} Could not read the changes of this pull request (${err.status || err.message}).`,
      );
    }
    return this.diff;
  }

  /**
   * Read a file, once.
   * @param ref the branch or commit, the default branch if not set
   * @returns {Promise<{content?: string, status?: number|string}>}
   */
  readFile(repo, file, ref = undefined) {
    const key = `${repo}\0${ref ?? ''}\0${file}`;
    if (!this.files.has(key)) {
      const [owner, repoName] = repo.split('/');
      this.files.set(
        key,
        this.octokit.rest.repos
          .getContent({
            owner,
            repo: repoName,
            path: file,
            ...(ref && { ref }),
            mediaType: { format: 'raw' },
          })
          .then(({ data }) => ({ content: String(data) }))
          .catch((err) => {
            core.info(`Failed to read ${repo}/${file}: ${err.message}`);
            return { status: err.status || err.message };
          }),
      );
    }
    return this.files.get(key);
  }

  async readDeployFile(repo, file) {
    const { content } = await this.readFile(repo, file);
    if (content === undefined) {
      return null;
    }
    try {
      return parseYaml(content) || {};
    } catch (err) {
      core.info(`Failed to parse ${repo}/${file}: ${err.message}`);
      return null;
    }
  }

  /**
   * Check all collected resources for usage.
   */
  async check() {
    const addedOnBase = await this.checkBehindBase();
    for (const resource of this.resources.values()) {
      core.info(`Check if ${resource.title} ${resource.name} is in use`);
      await this.checkCode(resource);
      this.checkAddedOnBase(resource, addedOnBase);
      if (resource.inUse) {
        core.warning(
          `Destroyed ${resource.title} ${resource.name} may still be in use.`,
        );
      }
    }
  }

  /**
   * Warn if the pull request is behind its base branch. Its plans then also
   * destroy resources the base branch added since.
   * @returns {{base: string, lines: string[]}} the lines added on the base
   * branch since the pull request branched off
   */
  async checkBehindBase() {
    const [owner, repo] = this.repository.split('/');
    try {
      const { data: pr } = await this.octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: this.pullRequestNumber,
      });
      this.headSha = pr.head.sha;
      const base = pr.base.ref;
      const { data } = await this.octokit.rest.repos.compareCommitsWithBasehead(
        { owner, repo, basehead: `${pr.head.sha}...${base}` },
      );
      if (!data.ahead_by) {
        return { base, lines: [] };
      }
      const text = `This pull request is ${data.ahead_by} commit(s) behind ${base}. The plans could also add/destroy resources added/destroyed there since. Update the branch and plan again <ins>before</ins> applying.`;
      this.behind = `${WARN} **${text}**`;
      core.warning(text.replaceAll(/<\/?ins>/g, ''));
      const lines = (data.files || []).flatMap(({ patch }) =>
        (patch || '')
          .split('\n')
          .filter((line) => line.startsWith('+'))
          .map((line) => line.slice(1)),
      );
      return { base, lines };
    } catch (err) {
      this.alerts.push(
        `${UNKNOWN} Could not check if this pull request is behind its base branch (${err.status || err.message}).`,
      );
      return { base: '', lines: [] };
    }
  }

  pullRequestFileUrl(repo, file) {
    return this.headSha
      ? `https://github.com/${repo}/blob/${this.headSha}/${file}`
      : undefined;
  }

  checkAddedOnBase(resource, { base, lines }) {
    const pattern = refPattern(resource.name);
    if (lines.some((line) => pattern.test(line))) {
      resource.add(
        WARN,
        `Added on ${base} after this pull request branched off. The plan destroys it because the branch is behind.`,
      );
    }
  }

  async searchCode(text) {
    const wait = this.lastSearch + this.searchInterval - Date.now();
    if (wait > 0) {
      await sleep(wait);
    }
    this.lastSearch = Date.now();
    const { data } = await this.octokit.rest.search.code({
      q: `"${text}" org:${this.org}`,
      per_page: 100,
      headers: { accept: 'application/vnd.github.text-match+json' },
    });
    const items = data.items || [];
    return { items, truncated: (data.total_count ?? 0) > items.length };
  }

  async checkCode(resource) {
    const refs = await this.findReferences(resource);
    // References from the repository that owns the resource don't count.
    resource.refs = refs.filter(({ repo }) => !resource.ownerRepos.has(repo));
    if (resource.kind === 'dns') {
      for (const ref of resource.refs) {
        // A live service still serves the domain, e.g. a new service that
        // keeps the URI customers already use.
        if (await this.mapsDomain(ref, resource.name)) {
          ref.kind = 'code';
          ref.note = `maps the domain in its ${DEPLOY_FILE}`;
          const service = deployService(
            await this.readDeployFile(ref.repo, ref.file),
          );
          const text = `is re-used by ${service ? `service ${service}` : `another service in ${ref.repo}`}. Do not destroy this DNS record.`;
          resource.add(WARN, text, `DNS ${resource.name} ${text}`);
        }
      }
    }
  }

  async findReferences(resource) {
    const pattern = refPattern(resource.name);
    const refs = [];

    // When the checkout is the pull request, search it locally. Otherwise,
    // e.g. when commenting on another repository, code search covers it.
    this.localCheckout ??= await isCheckoutOf(this.repository);
    if (this.localCheckout) {
      const files = new Map();
      for (const { file, lineNumber, text } of await gitGrep(resource.name)) {
        if (pattern.test(text)) {
          files.set(file, [...(files.get(file) || []), { lineNumber, text }]);
        }
      }
      for (const [file, matches] of files) {
        const comment = matches.every(({ text }) => COMMENT_LINE.test(text));
        refs.push({
          repo: this.repository,
          file,
          url: this.pullRequestFileUrl(this.repository, file),
          lines: matches.map(({ lineNumber }) => lineNumber),
          kind: comment ? 'comment' : 'code',
          note: NOT_REMOVED,
        });
      }
    }

    let search;
    try {
      search = await this.searchCode(resource.name);
    } catch (err) {
      resource.failed = `code search failed: ${err.status || err.message}`;
      return refs;
    }
    resource.truncated = search.truncated;
    const found = await Promise.all(
      search.items.map((item) =>
        this.limit(() => this.searchReference(resource, item, pattern)),
      ),
    );
    refs.push(...found.filter(Boolean));
    for (const ref of refs) {
      if (isDoc(ref.file)) {
        ref.kind = 'doc';
      }
    }
    return refs;
  }

  /**
   * Find the referencing lines of a code search hit.
   */
  async searchReference(resource, item, pattern) {
    const repo = item.repository.full_name;
    const fragments = (item.text_matches || []).map((m) => m.fragment);
    if (fragments.length > 0 && !fragments.some((f) => pattern.test(f))) {
      return null;
    }
    const inPullRequest = repo === this.repository;
    if (inPullRequest && this.localCheckout) {
      return null;
    }
    // Code search sees the default branch, which still has what the pull
    // request removes.
    const { content, status } = await this.readFile(
      repo,
      item.path,
      inPullRequest ? `refs/pull/${this.pullRequestNumber}/head` : undefined,
    );
    if (content !== undefined) {
      const match = findLines(content, pattern);
      // The file no longer references the name.
      return match
        ? {
            repo,
            file: item.path,
            url: inPullRequest
              ? this.pullRequestFileUrl(repo, item.path)
              : item.html_url,
            ...match,
            note: inPullRequest ? NOT_REMOVED : undefined,
          }
        : null;
    }
    if (inPullRequest) {
      if (status !== 404) {
        resource.add(
          UNKNOWN,
          `Could not read ${item.path} in this pull request (${status}).`,
        );
      }
      // Not found: the pull request removes the file.
      return null;
    }
    // Without the file, rely on the fragments. Without fragments, the match
    // can't be verified and counts as code.
    const match =
      fragments.length > 0 && findLines(fragments.join('\n'), pattern);
    return {
      repo,
      file: item.path,
      url: item.html_url,
      lines: [],
      kind: match ? match.kind : 'code',
    };
  }

  async mapsDomain({ repo, file }, host) {
    if (path.basename(file) !== DEPLOY_FILE || repo === this.repository) {
      return false;
    }
    const deploy = await this.readDeployFile(repo, file);
    return Object.values(deploy?.environments || {}).some((config) =>
      (config?.['domain-mappings'] || []).some(
        (h) =>
          String(h).replace(/\.$/, '').toLowerCase() === host.toLowerCase(),
      ),
    );
  }

  /**
   * Render the results as Markdown lines, or null if nothing was checked.
   * @returns {string[]|null}
   */
  render() {
    if (
      this.resources.size === 0 &&
      this.notes.length === 0 &&
      this.alerts.length === 0 &&
      !this.behind
    ) {
      return null;
    }
    const all = [...this.resources.values()];
    const environments = [...this.environments].sort((a, b) =>
      a.localeCompare(b),
    );
    const groups = this.groups.map((group) => ({
      title:
        group.services.length > 0
          ? group.services.join(', ')
          : group.repo.split('/')[1],
      resources: all.filter((r) => r.group === group.repo),
      environments: group.environments
        ? [...group.environments].sort((a, b) => a.localeCompare(b))
        : environments,
    }));
    const others = all.filter((r) => !r.group);
    // A failed check may hide usage.
    const servicesInUse = groups.filter((g) =>
      g.resources.some((r) => r.inUse || r.failed),
    ).length;
    const othersInUse = others.filter((r) => r.inUse).length;

    const lines = [];
    const counts = [];
    if (groups.length > 0) {
      counts.push([servicesInUse, plural(groups.length, 'removed service')]);
    }
    if (others.length > 0) {
      counts.push([
        othersInUse,
        plural(others.length, 'other destroyed resource'),
      ]);
    }
    if (servicesInUse + othersInUse > 0) {
      lines.push(
        `**${counts.map(([n, text]) => `${n} of ${text}`).join(' and ')} may still be in use.** Verify them <ins>before</ins> applying.`,
      );
    } else if (counts.length > 0 && !this.incompleteRepositoryChecks) {
      lines.push(
        `No usage found for ${counts.map(([, text]) => text).join(' and ')}.`,
      );
    }
    if (this.incompleteRepositoryChecks) {
      lines.push(
        'Some repository checks are incomplete; verify manually before applying.',
      );
    }
    lines.push('');
    if (this.fallbackToken) {
      lines.push(
        'Searched only repositories visible to github-token; set check-destroyed-resources-token for an org-wide search.',
        '',
      );
    }
    if (this.alerts.length > 0) {
      lines.push(...this.alerts, '');
    }
    if (others.length > 0) {
      groups.push({
        title: 'Other destroyed resources',
        resources: others,
        environments: [],
      });
    }
    for (const group of groups) {
      lines.push(...this.renderGroup(group));
    }
    lines.push(...this.notes.map((note) => `* ${note}`));
    if (this.notes.length > 0) {
      lines.push('');
    }
    return lines;
  }

  renderGroup({ title, resources, environments = [] }) {
    if (environments.length > 0 && title !== 'Other destroyed resources') {
      return this.renderFindingsGroup(title, resources, environments);
    }
    const files = mergeReferences(resources).filter(
      (ref) => !this.environments.has(environmentPath(ref)),
    );
    // The number of files that may still use a name of the kinds.
    const count = (kinds, test) => {
      const named = resources.filter((r) => kinds.includes(r.kind));
      const keys = new Set(
        named.flatMap((r) =>
          r.refs.filter(test).map(({ repo, file }) => `${repo}\0${file}`),
        ),
      );
      return `${keys.size}${named.some((r) => r.truncated) ? '+' : ''}`;
    };
    const used = ({ kind }) => kind === 'code';
    const counts = [
      `${count(['service', 'repository'], used)} service`,
      `${count(['dns'], used)} dns`,
      `${count(['sa'], used)} sa`,
      `${count(
        KINDS.map(([kind]) => kind),
        (ref) => !used(ref),
      )} doc/comment`,
    ];
    const failed = resources.filter((r) => r.failed);
    if (failed.length > 0) {
      counts.push(
        `${failed.length} ${NOT_ABLE_TO_CHECK} (${failed[0].failed})`,
      );
    }
    const summary = `${title}: ${counts.join(', ')}`;
    const findings = resources.flatMap((r) =>
      r.findings.map(
        ({ level, text, line }) =>
          `* ${level} ${line ?? `${r.title} ${r.name}: ${text}`}`,
      ),
    );

    if (files.length === 0) {
      return [summary, '', ...findings, ...(findings.length > 0 ? [''] : [])];
    }
    // This pull request first, then usage, then mentions.
    const rank = ({ note, kind }) =>
      note === NOT_REMOVED ? -1 : KIND_ORDER[kind];
    files.sort(
      (a, b) =>
        rank(a) - rank(b) ||
        a.repo.localeCompare(b.repo) ||
        a.file.localeCompare(b.file),
    );
    const shown = files.slice(0, MAX_FILES).map(fileLine);
    if (files.length > MAX_FILES) {
      shown.push(`… and ${files.length - MAX_FILES} more`);
    }
    return [
      '<details>',
      `<summary>${escapeHtml(summary)}</summary>`,
      '',
      '<pre>',
      ...shown,
      '</pre>',
      '',
      '</details>',
      '',
      ...findings,
      ...(findings.length > 0 ? [''] : []),
    ];
  }

  renderFindingsGroup(title, resources, environments) {
    // Files of any of the environments, each listed once.
    const files = mergeReferences(resources).filter((ref) =>
      environments.some((environment) =>
        belongsToEnvironment(ref, environment),
      ),
    );
    // This pull request first, then usage, then mentions.
    const rank = ({ note, kind }) =>
      note === NOT_REMOVED ? -1 : KIND_ORDER[kind];
    files.sort(
      (a, b) =>
        rank(a) - rank(b) ||
        a.repo.localeCompare(b.repo) ||
        a.file.localeCompare(b.file),
    );
    const shown = files.slice(0, MAX_FILES).map(fileLine);
    if (files.length > MAX_FILES) {
      shown.push(`… and ${files.length - MAX_FILES} more`);
    }
    const count = resources.some((resource) => resource.truncated)
      ? `${files.length}+`
      : files.length;
    const findings = resources.flatMap((resource) => [
      ...resource.findings.map(
        ({ level, text, line }) =>
          `* ${level} ${line ?? `${resource.title} ${resource.name}: ${text}`}`,
      ),
      ...(resource.failed
        ? [
            `* ${UNKNOWN} ${resource.title} ${resource.name}: ${NOT_ABLE_TO_CHECK} (${resource.failed})`,
          ]
        : []),
    ]);
    if (files.length === 0 && findings.length === 0) {
      return [
        `#### :orange_circle: ${escapeHtml(title)}`,
        '',
        'No findings, make also sure that no customers are using your resource.',
        '',
      ];
    }
    // Files that only mention the service, without any warning.
    const mentionsOnly =
      findings.length === 0 && files.every(({ kind }) => kind !== 'code');
    const lines = [
      `#### ${mentionsOnly ? ':orange_circle:' : ':red_circle:'} ${escapeHtml(title)}`,
      '',
      '<details>',
      `<summary>Findings ( ${count} )</summary>`,
      '',
    ];
    if (shown.length > 0) {
      lines.push('<pre>', ...shown, '</pre>', '');
    }
    lines.push(...findings, '</details>', '');
    return lines;
  }
}

export default DestroyedResources;
