import * as core from '@actions/core';
import * as exec from '@actions/exec';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import DestroyedResources from '../src/destroyed-resources.js';

vi.mock('@actions/core');
vi.mock('@actions/exec');

const SA = 'my-service@clan-prod-1234.iam.gserviceaccount.com';
const PR_HEAD = 'refs/pull/42/head';

const destroyPlan = (...changes) => ({
  resource_changes: changes.map(([type, before, actions = ['delete']]) => ({
    address: `${type}.this`,
    type,
    change: { actions, before },
  })),
});

const outputs = [
  {
    module: 'clan/prod',
    plan: 'clan/prod/plan.out',
    output: 'Plan: 0 to add, 0 to change, 3 to destroy.',
  },
  {
    module: 'clan/staging',
    plan: 'clan/staging/plan.out',
    output: 'Plan: 1 to add, 0 to change, 0 to destroy.',
  },
];

const deployYaml = `cloud-run:
  service: my-service
environments:
  production:
    domain-mappings:
      - my-service.retailsvc.com
  staging:
    domain-mappings:
      - my-service.retailsvc.dev
`;

// The pull request removes the services from the project.
const removePatch = `@@ -1,6 +1,2 @@
 projects = {
-  my-service = {
-    repository = "my-service"
-  }
-  gone = {}
 }`;

const notFound = () => Object.assign(new Error('Not Found'), { status: 404 });

/**
 * Fake file contents by `owner/repo:path`, or `owner/repo@ref:path` for a
 * branch. Any cloud-deploy.yaml defaults to deployYaml.
 */
const mockFiles = (octokit, files = {}) => {
  octokit.mockFileContents ??= {};
  Object.assign(octokit.mockFileContents, files);
  octokit.rest.repos.getContent.mockImplementation(
    async ({ owner, repo, path, ref }) => {
      const key = `${owner}/${repo}${ref ? `@${ref}` : ''}:${path}`;
      if (key in octokit.mockFileContents) {
        return { data: octokit.mockFileContents[key] };
      }
      if (!ref && path.endsWith('cloud-deploy.yaml')) {
        return { data: deployYaml };
      }
      throw notFound();
    },
  );
};

const mockProjectVersions = (octokit, file, base, head) => {
  mockFiles(octokit, {
    [`extenda/tf-infra-gcp@merge-sha:${file}`]: base,
    [`extenda/tf-infra-gcp@refs/pull/42/head:${file}`]: head,
  });
};

const mockOctokit = () => {
  const octokit = {
    paginate: vi.fn(async (method, params) => (await method(params)).data),
    rest: {
      pulls: {
        get: vi.fn().mockResolvedValue({
          data: {
            base: { ref: 'master', sha: 'base-sha' },
            head: { sha: 'head-sha' },
          },
        }),
        listFiles: vi.fn().mockResolvedValue({
          data: [{ filename: 'p.hcl', patch: removePatch }],
        }),
      },
      git: {
        getTree: vi.fn().mockResolvedValue({
          data: {
            tree: [
              { type: 'blob', path: 'cloud-deploy.yaml' },
              { type: 'blob', path: 'README.md' },
            ],
          },
        }),
      },
      repos: {
        get: vi.fn().mockResolvedValue({
          data: { default_branch: 'main' },
        }),
        compareCommitsWithBasehead: vi.fn().mockResolvedValue({
          data: {
            ahead_by: 0,
            files: [],
            merge_base_commit: { sha: 'merge-sha' },
          },
        }),
        getContent: vi.fn(),
      },
      search: {
        code: vi.fn().mockResolvedValue({ data: { items: [] } }),
      },
    },
  };
  mockFiles(octokit);
  return octokit;
};

const searchItem = (repo, path, fragment) => ({
  repository: { full_name: repo },
  path,
  html_url: `https://github.com/${repo}/blob/sha/${path}`,
  text_matches: fragment ? [{ fragment }] : [],
});

/**
 * Fake code search results by searched text.
 */
const mockSearch = (octokit, results) => {
  octokit.rest.search.code.mockImplementation(async ({ q }) => {
    const text = q.match(/^"(.*)" org:/)[1];
    return { data: { items: results[text] || [] } };
  });
};

// Fake git: the checkout's origin and git grep output.
const mockGitGrep = (
  grep = '',
  origin = 'https://github.com/extenda/tf-infra-gcp.git',
) => {
  exec.exec.mockImplementation(async (bin, args, opts) => {
    const stdout = args[0] === 'remote' ? `${origin}\n` : grep;
    opts.listeners.stdout(Buffer.from(stdout, 'utf8'));
    return 0;
  });
};

const newChecker = (octokit) =>
  new DestroyedResources(octokit, {
    org: 'extenda',
    repository: 'extenda/tf-infra-gcp',
    pullRequestNumber: 42,
    searchInterval: 0,
  });

const run = async (octokit, ...changes) => {
  const checker = newChecker(octokit);
  await checker.collect(
    outputs,
    vi.fn().mockResolvedValue(destroyPlan(...changes)),
  );
  await checker.check();
  return checker;
};

const runWithEnvironments = async (octokit, environments, ...changes) => {
  const checker = newChecker(octokit);
  await checker.collect(
    environments.map((environment) => ({
      module: `extendaretail-com/departments/product-development/experience/clans/eva/${environment}`,
      plan: `organization/extendaretail-com/departments/product-development/experience/clans/eva/${environment}/plan.out`,
      output: 'Plan: 0 to add, 0 to change, 1 to destroy.',
    })),
    vi.fn().mockResolvedValue(destroyPlan(...changes)),
  );
  await checker.check();
  return checker;
};

const blob = (repo, path, ref = 'sha') =>
  `https://github.com/${repo}/blob/${ref}/${path}`;

describe('Destroyed resources', () => {
  let octokit;

  beforeEach(() => {
    octokit = mockOctokit();
    mockGitGrep();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Collect', () => {
    test('It collects destroyed resources from plans with destroys', async () => {
      const showJson = vi
        .fn()
        .mockResolvedValue(
          destroyPlan(
            ['google_service_account', { email: SA }],
            ['google_dns_record_set', { name: 'api.example.com.' }],
            [
              'google_service_account',
              { email: 'replaced@p.iam' },
              ['delete', 'create'],
            ],
            ['google_storage_bucket', { name: 'bucket' }],
          ),
        );
      const checker = newChecker(octokit);
      await checker.collect(outputs, showJson);

      expect(showJson).toHaveBeenCalledTimes(1);
      expect(showJson).toHaveBeenCalledWith('clan/prod/plan.out');
      expect([...checker.resources.keys()]).toEqual([
        `sa:${SA}`,
        'dns:api.example.com',
      ]);
      expect(checker.groups).toEqual([]);
      expect(octokit.rest.git.getTree).not.toHaveBeenCalled();
    });

    test('It records only environments with destroys', async () => {
      const checker = newChecker(octokit);
      await checker.collect(
        [
          {
            module: 'staging',
            plan: 'organization/extendaretail-com/departments/product-development/experience/clans/eva/staging/plan.out',
            output: 'Plan: 0 to add, 0 to change, 1 to destroy.',
          },
          {
            module: 'prod',
            plan: 'organization/extendaretail-com/departments/product-development/experience/clans/eva/prod/plan.out',
            output: 'Plan: 0 to add, 0 to change, 0 to destroy.',
          },
        ],
        vi.fn().mockResolvedValue(destroyPlan()),
      );

      expect([...checker.environments]).toEqual([
        'extendaretail-com/departments/product-development/experience/clans/eva/staging',
      ]);
    });

    test('It groups the service, domains and service account of a removed repository', async () => {
      const showJson = vi
        .fn()
        .mockResolvedValue(
          destroyPlan(
            ['github_actions_secret', { repository: 'my-service' }],
            ['google_service_account', { email: SA }],
            ['google_dns_record_set', { name: 'my-service.retailsvc.com.' }],
            ['google_dns_record_set', { name: 'api.example.com.' }],
          ),
        );
      const checker = newChecker(octokit);
      await checker.collect(outputs, showJson);

      expect(checker.groups).toEqual([
        { repo: 'extenda/my-service', services: ['my-service'] },
      ]);
      const group = (key) => checker.resources.get(key).group;
      expect(group('service:my-service')).toBe('extenda/my-service');
      expect(group('dns:my-service.retailsvc.com')).toBe('extenda/my-service');
      expect(group('dns:my-service.retailsvc.dev')).toBe('extenda/my-service');
      expect(group(`sa:${SA}`)).toBe('extenda/my-service');
      expect(group('dns:api.example.com')).toBeUndefined();
      // The repository has the name of its service.
      expect(checker.resources.has('repository:my-service')).toBe(false);
    });

    test('It checks the repository name if it differs from the service', async () => {
      mockFiles(octokit, {
        'extenda/hiiretail-short-name:cloud-deploy.yaml':
          'cloud-run:\n  service: short-name\n',
      });
      octokit.rest.pulls.listFiles.mockResolvedValue({
        data: [{ patch: '-  short-name = {}' }],
      });
      const checker = await run(octokit, [
        'github_actions_secret',
        { repository: 'hiiretail-short-name' },
      ]);

      expect([...checker.resources.keys()]).toEqual([
        'service:short-name',
        'repository:hiiretail-short-name',
      ]);
      expect(octokit.rest.search.code).toHaveBeenCalledWith(
        expect.objectContaining({ q: '"short-name" org:extenda' }),
      );
    });

    test('It notes removed repositories that can not be read', async () => {
      octokit.rest.git.getTree.mockRejectedValue(notFound());
      const checker = await run(octokit, [
        'github_actions_secret',
        { repository: 'gone' },
      ]);

      expect([...checker.resources.keys()]).toEqual(['repository:gone']);
      expect(checker.render().join('\n')).toContain(
        'Repository extenda/gone is removed by this pull request, but could not be fully checked (404).',
      );
      expect(checker.render().join('\n')).not.toContain('No usage found');
    });

    test('It does not remove a repository that keeps some of its secrets', async () => {
      mockFiles(octokit, {
        'extenda/gone:cloud-deploy.yaml': 'cloud-run:\n  service: gone\n',
      });
      const showJson = vi
        .fn()
        .mockResolvedValue(
          destroyPlan(
            ['github_actions_secret', { repository: 'my-service' }],
            ['github_actions_secret', { repository: 'my-service' }, ['no-op']],
            ['github_actions_secret', { repository: 'gone' }],
          ),
        );
      const checker = newChecker(octokit);
      await checker.collect(outputs, showJson);

      expect(octokit.rest.git.getTree).toHaveBeenCalledTimes(1);
      expect(octokit.rest.git.getTree).toHaveBeenCalledWith(
        expect.objectContaining({ repo: 'gone' }),
      );
      expect(checker.resources.has('service:my-service')).toBe(false);
    });

    test('It does not check a repository if the pull request keeps its service', async () => {
      // The service moves to another project.
      octokit.rest.pulls.listFiles.mockResolvedValue({
        data: [
          { patch: '-  my-service = {}' },
          { patch: '+  my-service = {}' },
        ],
      });
      const checker = await run(octokit, [
        'github_actions_secret',
        { repository: 'my-service' },
      ]);

      expect(octokit.rest.pulls.listFiles).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'extenda',
          repo: 'tf-infra-gcp',
          pull_number: 42,
        }),
      );
      expect(checker.resources.size).toBe(0);
      expect(octokit.rest.search.code).not.toHaveBeenCalled();
      expect(checker.render().join('\n')).toContain(
        'Secrets for extenda/my-service are removed by this pull request, but its service my-service is not, so it was not checked.',
      );
    });

    test('It does not trust the plan alone that a service is removed', async () => {
      // A pull request behind the base branch destroys a service added there.
      octokit.rest.pulls.listFiles.mockResolvedValue({ data: [] });
      const showJson = vi
        .fn()
        .mockResolvedValue(
          destroyPlan(
            ['github_actions_secret', { repository: 'my-service' }],
            ['google_service_account', { email: SA }],
          ),
        );
      const checker = newChecker(octokit);
      await checker.collect(outputs, showJson);

      expect([...checker.resources.keys()]).toEqual([`sa:${SA}`]);
      expect(checker.resources.get(`sa:${SA}`).group).toBeUndefined();
      expect(checker.notes).toEqual([
        ':information_source: Secrets for extenda/my-service are removed by this pull request, but its service my-service is not, so it was not checked.',
      ]);
    });

    test('It only checks the removed service of a repository with several services', async () => {
      octokit.rest.git.getTree.mockResolvedValue({
        data: {
          tree: [
            { type: 'blob', path: 'kept/cloud-deploy.yaml' },
            { type: 'blob', path: 'removed/cloud-deploy.yaml' },
          ],
        },
      });
      mockFiles(octokit, {
        'extenda/monorepo:kept/cloud-deploy.yaml':
          'cloud-run:\n  service: kept\nenvironments:\n  production:\n    domain-mappings:\n      - kept.retailsvc.com\n',
      });
      const checker = newChecker(octokit);
      await checker.collect(
        outputs,
        vi
          .fn()
          .mockResolvedValue(
            destroyPlan(['github_actions_secret', { repository: 'monorepo' }]),
          ),
      );

      expect([...checker.resources.keys()]).toEqual([
        'service:my-service',
        'dns:my-service.retailsvc.com',
        'dns:my-service.retailsvc.dev',
        'repository:monorepo',
      ]);
    });

    test('It reports when a repository tree is truncated', async () => {
      octokit.rest.git.getTree.mockResolvedValue({
        data: {
          tree: [{ type: 'blob', path: 'visible/cloud-deploy.yaml' }],
          truncated: true,
        },
      });
      mockFiles(octokit, {
        'extenda/my-service:visible/cloud-deploy.yaml': `cloud-run:
  service: my-service
environments:
  production:
    domain-mappings:
      - my-service.retailsvc.com
`,
      });

      const checker = await run(octokit, [
        'github_actions_secret',
        { repository: 'my-service' },
      ]);

      expect(checker.notes).toContain(
        ':grey_question: Repository extenda/my-service is removed by this pull request, but could not be fully checked (repository tree was truncated).',
      );
      expect(checker.notes.join('\n')).not.toContain('no cloud-deploy.yaml');
      expect(checker.resources.has('dns:my-service.retailsvc.com')).toBe(false);
      expect(checker.render().join('\n')).not.toContain('No usage found');
      expect(checker.render().join('\n')).toContain(
        'Some repository checks are incomplete; verify manually before applying.',
      );
    });

    test('It does not skip a repository with an incomplete tree', async () => {
      octokit.rest.git.getTree.mockResolvedValue({
        data: { tree: [], truncated: true },
      });
      octokit.rest.pulls.listFiles.mockResolvedValue({
        data: [{ patch: '-  deleted-service = {}' }],
      });

      const checker = await run(octokit, [
        'github_actions_secret',
        { repository: 'my-service' },
      ]);

      expect(checker.notes).toContain(
        ':grey_question: Repository extenda/my-service could not be checked (repository tree was truncated); service removal and DNS mappings may be incomplete.',
      );
      expect(checker.notes.join('\n')).not.toContain(
        'its service my-service is not',
      );
      expect(checker.render().join('\n')).toContain(
        'Some repository checks are incomplete; verify manually before applying.',
      );
    });

    test('It resolves repository trees from the remote default branch', async () => {
      await run(octokit, [
        'github_actions_secret',
        { repository: 'my-service' },
      ]);

      expect(octokit.rest.repos.get).toHaveBeenCalledWith({
        owner: 'extenda',
        repo: 'my-service',
      });
      expect(octokit.rest.git.getTree).toHaveBeenCalledWith({
        owner: 'extenda',
        repo: 'my-service',
        tree_sha: 'main',
        recursive: 'true',
      });
    });

    test.each([
      ['unreadable', null],
      ['malformed', 'cloud-run:\n  service: ['],
    ])(
      'It marks repository checks incomplete when cloud-deploy.yaml is %s',
      async (_condition, contents) => {
        octokit.rest.pulls.listFiles.mockResolvedValue({
          data: [{ patch: '-  my-service = {}' }],
        });
        if (contents === null) {
          octokit.rest.repos.getContent.mockRejectedValue(notFound());
        } else {
          mockFiles(octokit, {
            'extenda/my-service:cloud-deploy.yaml': contents,
          });
        }

        const checker = await run(octokit, [
          'github_actions_secret',
          { repository: 'my-service' },
        ]);

        expect(checker.incompleteRepositoryChecks).toBe(true);
        expect(checker.render().join('\n')).toContain(
          'Some repository checks are incomplete; verify manually before applying.',
        );
        expect(checker.notes.join('\n')).toContain(
          'could not be fully checked',
        );
      },
    );
  });

  describe('Check', () => {
    test('It does not report removed project services without planned destroys', async () => {
      octokit.rest.pulls.listFiles.mockResolvedValue({
        data: [
          {
            filename:
              'organization/extendaretail-com/departments/product-development/experience/clans/eva/prod/project.yaml',
            patch: '@@ -28,1 +28,0 @@\n-  - name: eva-router',
          },
        ],
      });
      const checker = newChecker(octokit);
      await checker.collect(
        [
          {
            module: 'clan/prod',
            plan: 'clan/prod/plan.out',
            output: 'Plan: 0 to add, 0 to change, 0 to destroy.',
          },
        ],
        vi.fn(),
      );
      await checker.check();

      expect(checker.resources.has('service:eva-router')).toBe(false);
      expect(octokit.rest.pulls.listFiles).not.toHaveBeenCalled();
      expect(octokit.rest.search.code).not.toHaveBeenCalled();
      expect(checker.render()).toBeNull();
    });

    test('It checks service entries removed from project YAML without deleted secrets', async () => {
      const projectFile =
        'organization/extendaretail-com/departments/product-development/experience/clans/eva/prod/project.yaml';
      mockProjectVersions(
        octokit,
        projectFile,
        'services:\n  - name: eva-router\n  - name: eva-clearon-adapter\n',
        'services: []\n',
      );
      octokit.rest.pulls.listFiles.mockResolvedValue({
        data: [
          {
            filename: projectFile,
            patch:
              '@@ -28,2 +28,0 @@\n-  - name: eva-router\n-  - name: eva-clearon-adapter',
          },
        ],
      });
      mockSearch(octokit, {
        'eva-router': [
          searchItem(
            'extenda/gateway',
            'config/routes.yaml',
            'service: eva-router',
          ),
        ],
        'eva-clearon-adapter': [
          searchItem(
            'extenda/experience-eva-common',
            'infra/prod/monitoring/adapter.yaml',
            'eva-clearon-adapter',
          ),
        ],
      });
      mockFiles(octokit, {
        'extenda/gateway:config/routes.yaml': 'service: eva-router\n',
        'extenda/experience-eva-common:infra/prod/monitoring/adapter.yaml':
          'service: eva-clearon-adapter\n',
      });

      const checker = await runWithEnvironments(
        octokit,
        ['prod'],
        ['google_service_account', { email: SA }],
      );

      expect(checker.resources.get('service:eva-router').refs).toEqual([
        {
          repo: 'extenda/gateway',
          file: 'config/routes.yaml',
          url: blob('extenda/gateway', 'config/routes.yaml'),
          lines: [1],
          kind: 'code',
          note: undefined,
        },
      ]);
      expect(checker.resources.get('service:eva-clearon-adapter').refs).toEqual(
        [
          {
            repo: 'extenda/experience-eva-common',
            file: 'infra/prod/monitoring/adapter.yaml',
            url: blob(
              'extenda/experience-eva-common',
              'infra/prod/monitoring/adapter.yaml',
            ),
            lines: [1],
            kind: 'code',
            note: undefined,
          },
        ],
      );
      const comment = checker.render().join('\n');
      expect(
        comment.match(/<summary>Findings \( 1 \)<\/summary>/g),
      ).toHaveLength(2);
      expect(comment).toContain('infra/prod/monitoring/adapter.yaml');
      expect(comment).toContain('config/routes.yaml');
      expect(comment).not.toContain('<summary>prod (');
    });

    test('It does not check project services moved elsewhere in the pull request', async () => {
      const prod =
        'organization/extendaretail-com/departments/product-development/experience/clans/eva/prod/project.yaml';
      const staging =
        'organization/extendaretail-com/departments/product-development/experience/clans/eva/staging/project.yaml';
      mockProjectVersions(
        octokit,
        prod,
        'services:\n  - name: eva-router\n',
        'services: []\n',
      );
      mockProjectVersions(
        octokit,
        staging,
        'services: []\n',
        'services:\n  - name: eva-router\n',
      );
      octokit.rest.pulls.listFiles.mockResolvedValue({
        data: [
          {
            filename: prod,
            patch: '@@ -28,1 +28,0 @@\n-  - name: eva-router',
          },
          {
            filename: staging,
            patch: '@@ -28,0 +28,1 @@\n+  - name: eva-router',
          },
        ],
      });

      const checker = await runWithEnvironments(
        octokit,
        ['prod', 'staging'],
        ['google_service_account', { email: SA }],
      );

      expect(checker.resources.has('service:eva-router')).toBe(false);
      expect(octokit.rest.search.code).not.toHaveBeenCalledWith(
        expect.objectContaining({ q: '"eva-router" org:extenda' }),
      );
    });

    test('It ignores removed names under unrelated project sections', async () => {
      const projectFile =
        'organization/extendaretail-com/departments/product-development/experience/clans/eva/prod/project.yaml';
      mockProjectVersions(
        octokit,
        projectFile,
        'service_accounts:\n  - name: eva-router\nservices: []\n',
        'service_accounts: []\nservices: []\n',
      );
      octokit.rest.pulls.listFiles.mockResolvedValue({
        data: [
          {
            filename: projectFile,
            patch: '@@ -29,1 +29,0 @@\n-  - name: eva-router',
          },
        ],
      });

      const checker = await runWithEnvironments(
        octokit,
        ['prod'],
        ['google_service_account', { email: SA }],
      );

      expect(checker.resources.has('service:eva-router')).toBe(false);
      expect(octokit.rest.search.code).not.toHaveBeenCalledWith(
        expect.objectContaining({ q: '"eva-router" org:extenda' }),
      );
    });

    test('It checks services when a project YAML file is deleted', async () => {
      const projectFile =
        'organization/extendaretail-com/departments/product-development/experience/clans/eva/prod/project.yaml';
      mockFiles(octokit, {
        [`extenda/tf-infra-gcp@merge-sha:${projectFile}`]:
          'services:\n  - name: eva-router\n',
      });
      octokit.rest.pulls.listFiles.mockResolvedValue({
        data: [{ filename: projectFile, status: 'removed', patch: null }],
      });
      mockSearch(octokit, {
        'eva-router': [
          searchItem('extenda/gateway', 'config/routes.yaml', 'eva-router'),
        ],
      });
      mockFiles(octokit, {
        'extenda/gateway:config/routes.yaml': 'service: eva-router\n',
      });

      const checker = await runWithEnvironments(
        octokit,
        ['prod', 'staging'],
        ['google_service_account', { email: SA }],
      );

      expect(checker.notes).toEqual([]);
      expect(checker.resources.get('service:eva-router').refs).toHaveLength(1);
    });

    test.each(['prod', 'staging'])(
      'It reports a service removed only from %s, while it remains in the opposite environment',
      async (removedEnvironment) => {
        const project = (environment) =>
          `organization/extendaretail-com/departments/product-development/experience/clans/eva/${environment}/project.yaml`;
        const modules = (environment) =>
          `extendaretail-com/departments/product-development/experience/clans/eva/${environment}`;
        const oppositeEnvironment =
          removedEnvironment === 'prod' ? 'staging' : 'prod';
        const removedFile = project(removedEnvironment);
        const oppositeFile = project(oppositeEnvironment);
        const headContents = {
          [removedFile]: 'services: []\n',
          [oppositeFile]: 'services:\n  - name: eva-router\n',
        };
        for (const environment of ['prod', 'staging']) {
          mockProjectVersions(
            octokit,
            project(environment),
            'services:\n  - name: eva-router\n',
            headContents[project(environment)],
          );
        }
        octokit.rest.pulls.listFiles.mockResolvedValue({
          data: [
            {
              filename: removedFile,
              status: 'modified',
              patch: '@@ -28,1 +28,0 @@\n-  - name: eva-router',
            },
          ],
        });
        mockSearch(octokit, {
          'eva-router': [
            searchItem(
              'extenda/usage',
              'infra/prod/service.yaml',
              'service: eva-router',
            ),
            searchItem(
              'extenda/usage',
              'infra/staging/service.yaml',
              'service: eva-router',
            ),
          ],
        });
        mockFiles(octokit, {
          'extenda/usage:infra/prod/service.yaml': 'service: eva-router\n',
          'extenda/usage:infra/staging/service.yaml': 'service: eva-router\n',
        });
        const checker = newChecker(octokit);
        const plan = destroyPlan();
        await checker.collect(
          ['prod', 'staging'].map((environment) => ({
            module: modules(environment),
            plan: `organization/${modules(environment)}/plan.out`,
            output: 'Plan: 0 to add, 0 to change, 1 to destroy.',
          })),
          vi.fn().mockResolvedValue(plan),
        );
        await checker.check();

        const group = checker.groups.find(({ services }) =>
          services.includes('eva-router'),
        );
        expect([...group.environments]).toEqual([modules(removedEnvironment)]);
        const comment = checker.render().join('\n');
        expect(comment.match(/<summary>/g)).toHaveLength(1);
        expect(comment).toContain('<summary>Findings ( 1 )</summary>');
        expect(comment).toContain(`infra/${removedEnvironment}/service.yaml`);
        expect(comment).not.toContain(
          `infra/${oppositeEnvironment}/service.yaml`,
        );
      },
    );

    test('It checks services from a renamed project YAML file', async () => {
      const oldFile =
        'organization/extendaretail-com/departments/product-development/experience/clans/eva/staging/project.yaml';
      const newFile =
        'organization/extendaretail-com/departments/product-development/experience/clans/eva/prod/project.yaml';
      mockFiles(octokit, {
        [`extenda/tf-infra-gcp@merge-sha:${oldFile}`]:
          'services:\n  - name: eva-router\n',
        [`extenda/tf-infra-gcp@refs/pull/42/head:${newFile}`]: 'services: []\n',
        'extenda/gateway:config/routes.yaml': 'service: eva-router\n',
      });
      octokit.rest.pulls.listFiles.mockResolvedValue({
        data: [
          {
            filename: newFile,
            previous_filename: oldFile,
            status: 'renamed',
            patch: null,
          },
        ],
      });
      mockSearch(octokit, {
        'eva-router': [
          searchItem('extenda/gateway', 'config/routes.yaml', 'eva-router'),
        ],
      });

      const checker = await runWithEnvironments(
        octokit,
        ['staging'],
        ['google_service_account', { email: SA }],
      );

      expect(checker.resources.get('service:eva-router').refs).toHaveLength(1);
    });

    test('A same-named addition in an unrelated section does not suppress service removal', async () => {
      const projectFile =
        'organization/extendaretail-com/departments/product-development/experience/clans/eva/prod/project.yaml';
      mockProjectVersions(
        octokit,
        projectFile,
        'services:\n  - name: eva-router\nservice_accounts: []\n',
        'services:\n  - name: other-service\nservice_accounts:\n  - name: eva-router\n',
      );
      octokit.rest.pulls.listFiles.mockResolvedValue({
        data: [
          {
            filename: projectFile,
            patch:
              '@@ -28,4 +28,4 @@\n-  - name: eva-router\n+  - name: other-service\n+service_accounts:\n+  - name: eva-router',
          },
        ],
      });
      mockSearch(octokit, {
        'eva-router': [
          searchItem('extenda/gateway', 'config/routes.yaml', 'eva-router'),
        ],
      });
      mockFiles(octokit, {
        'extenda/gateway:config/routes.yaml': 'service: eva-router\n',
      });

      const checker = await runWithEnvironments(
        octokit,
        ['prod'],
        ['google_service_account', { email: SA }],
      );

      expect(checker.resources.get('service:eva-router').refs).toEqual([
        {
          repo: 'extenda/gateway',
          file: 'config/routes.yaml',
          url: blob('extenda/gateway', 'config/routes.yaml'),
          lines: [1],
          kind: 'code',
          note: undefined,
        },
      ]);
    });

    test('It finds the referencing lines in other repositories but not in the owner', async () => {
      mockSearch(octokit, {
        'my-service.retailsvc.com': [
          searchItem(
            'extenda/my-service',
            'cloud-deploy.yaml',
            '- my-service.retailsvc.com',
          ),
          searchItem(
            'extenda/mobile-app',
            'src/api.ts',
            "url = 'https://my-service.retailsvc.com/api'",
          ),
          searchItem(
            'extenda/mobile-app',
            'docs/api.md',
            'my-service.retailsvc.com',
          ),
          searchItem(
            'extenda/other',
            'config.yaml',
            'sub.my-service.retailsvc.com',
          ),
        ],
      });
      mockFiles(octokit, {
        'extenda/mobile-app:src/api.ts':
          "// API\nconst url = 'https://my-service.retailsvc.com/api';\n",
        'extenda/mobile-app:docs/api.md': '# API\n\nmy-service.retailsvc.com\n',
      });
      const checker = newChecker(octokit);
      await checker.collect(
        [
          {
            module:
              'extendaretail-com/departments/product-development/experience/clans/eva/staging',
            plan: 'organization/extendaretail-com/departments/product-development/experience/clans/eva/staging/plan.out',
            output: 'Plan: 0 to add, 0 to change, 1 to destroy.',
          },
          {
            module:
              'extendaretail-com/departments/product-development/experience/clans/eva/prod',
            plan: 'organization/extendaretail-com/departments/product-development/experience/clans/eva/prod/plan.out',
            output: 'Plan: 0 to add, 0 to change, 1 to destroy.',
          },
        ],
        vi
          .fn()
          .mockResolvedValue(
            destroyPlan([
              'github_actions_secret',
              { repository: 'my-service' },
            ]),
          ),
      );
      await checker.check();

      const dns = checker.resources.get('dns:my-service.retailsvc.com');
      expect(dns.inUse).toBe(true);
      expect(dns.refs).toEqual([
        {
          repo: 'extenda/mobile-app',
          file: 'src/api.ts',
          url: blob('extenda/mobile-app', 'src/api.ts'),
          lines: [2],
          kind: 'code',
          note: undefined,
        },
        {
          repo: 'extenda/mobile-app',
          file: 'docs/api.md',
          url: blob('extenda/mobile-app', 'docs/api.md'),
          lines: [3],
          kind: 'doc',
          note: undefined,
        },
      ]);
      expect(core.warning).toHaveBeenCalledWith(
        'Destroyed DNS my-service.retailsvc.com may still be in use.',
      );
    });

    test('It does not count references only in comments as usage', async () => {
      mockSearch(octokit, {
        [SA]: [
          searchItem('extenda/ui', 'src/base.ts', `routed through ${SA}`),
          searchItem('extenda/deploy', 'deploy.sh', `--service-account=${SA}`),
        ],
      });
      mockFiles(octokit, {
        'extenda/ui:src/base.ts': `/**\n * Routed through ${SA} gateway\n */\n`,
        'extenda/deploy:deploy.sh': `gcloud run deploy \\\n  --service-account=${SA} \\\n`,
      });
      const checker = await run(octokit, [
        'google_service_account',
        { email: SA },
      ]);

      expect(
        checker.resources
          .get(`sa:${SA}`)
          .refs.map(({ repo, lines, kind }) => [repo, lines, kind]),
      ).toEqual([
        ['extenda/ui', [2], 'comment'],
        ['extenda/deploy', [2], 'code'],
      ]);
    });

    test('It warns when another service took over the domain of a removed repository', async () => {
      mockSearch(octokit, {
        'my-service.retailsvc.com': [
          searchItem(
            'extenda/new-service',
            'cloud-deploy.yaml',
            '- my-service.retailsvc.com',
          ),
        ],
      });
      const checker = await run(octokit, [
        'github_actions_secret',
        { repository: 'my-service' },
      ]);

      expect(
        checker.resources.get('dns:my-service.retailsvc.com').refs,
      ).toEqual([
        {
          repo: 'extenda/new-service',
          file: 'cloud-deploy.yaml',
          url: blob('extenda/new-service', 'cloud-deploy.yaml'),
          lines: [6],
          kind: 'code',
          note: 'maps the domain in its cloud-deploy.yaml',
        },
      ]);
    });

    test('It warns once per cloud-deploy.yaml that re-uses the DNS name', async () => {
      mockSearch(octokit, {
        'my-service.retailsvc.com': [
          searchItem(
            'extenda/new-service',
            'cloud-deploy.yaml',
            '- my-service.retailsvc.com',
          ),
          searchItem(
            'extenda/gateway',
            'nginx.conf',
            'server my-service.retailsvc.com;',
          ),
        ],
      });
      mockFiles(octokit, {
        'extenda/gateway:nginx.conf': 'server my-service.retailsvc.com;\n',
        'extenda/new-service:cloud-deploy.yaml':
          'cloud-run:\n  service: pnp-item-query-api\nenvironments:\n  production:\n    domain-mappings:\n      - my-service.retailsvc.com\n',
      });

      const checker = await runWithEnvironments(
        octokit,
        ['prod', 'staging'],
        ['github_actions_secret', { repository: 'my-service' }],
      );

      const warning =
        '* :warning: DNS my-service.retailsvc.com is re-used by service pnp-item-query-api. Do not destroy this DNS record.';
      const comment = checker.render().join('\n');
      expect(comment).toContain(
        `<a href="${blob('extenda/new-service', 'cloud-deploy.yaml')}">extenda/new-service/cloud-deploy.yaml</a>`,
      );
      expect(comment.split('\n').filter((l) => l === warning)).toHaveLength(1);
      expect(comment.match(/re-used by/g)).toHaveLength(1);
    });

    test('It does not warn for a DNS name outside domain-mappings', async () => {
      mockSearch(octokit, {
        'my-service.retailsvc.com': [
          searchItem(
            'extenda/new-service',
            'cloud-deploy.yaml',
            'url: https://my-service.retailsvc.com',
          ),
        ],
      });
      mockFiles(octokit, {
        'extenda/new-service:cloud-deploy.yaml':
          'cloud-run:\n  service: new-service\n  env:\n    url: https://my-service.retailsvc.com\n',
      });

      const checker = await runWithEnvironments(
        octokit,
        ['prod', 'staging'],
        ['github_actions_secret', { repository: 'my-service' }],
      );

      const comment = checker.render().join('\n');
      expect(comment).toContain('extenda/new-service/cloud-deploy.yaml');
      expect(comment).not.toContain('re-used by');
    });

    test('It names the repository when the cloud-deploy.yaml has no service', async () => {
      mockSearch(octokit, {
        'my-service.retailsvc.com': [
          searchItem(
            'extenda/new-service',
            'cloud-deploy.yaml',
            '- my-service.retailsvc.com',
          ),
        ],
      });
      mockFiles(octokit, {
        'extenda/new-service:cloud-deploy.yaml':
          'environments:\n  production:\n    domain-mappings:\n      - my-service.retailsvc.com\n',
      });

      const checker = await runWithEnvironments(
        octokit,
        ['prod', 'staging'],
        ['github_actions_secret', { repository: 'my-service' }],
      );

      expect(checker.render()).toContain(
        '* :warning: DNS my-service.retailsvc.com is re-used by another service in extenda/new-service. Do not destroy this DNS record.',
      );
    });

    test('It does not warn when the cloud-deploy.yaml can not be parsed', async () => {
      mockSearch(octokit, {
        'my-service.retailsvc.com': [
          searchItem(
            'extenda/new-service',
            'cloud-deploy.yaml',
            '- my-service.retailsvc.com',
          ),
        ],
      });
      mockFiles(octokit, {
        'extenda/new-service:cloud-deploy.yaml':
          'domain-mappings: [\n  - my-service.retailsvc.com\n',
      });

      const checker = await runWithEnvironments(
        octokit,
        ['prod', 'staging'],
        ['github_actions_secret', { repository: 'my-service' }],
      );

      expect(checker.render().join('\n')).not.toContain('re-used by');
    });

    test('It finds references left in the checked out pull request', async () => {
      mockGitGrep(
        [
          `HEAD:organization/iam.hcl:12:  "serviceAccount:${SA}" = [`,
          `HEAD:organization/iam.hcl:30:  "serviceAccount:${SA}",`,
          `HEAD:organization/notes.hcl:3:  # Removed ${SA}`,
          '',
        ].join('\n'),
      );
      mockSearch(octokit, {
        [SA]: [searchItem('extenda/tf-infra-gcp', 'infra/iam.hcl', SA)],
      });
      const checker = await run(octokit, [
        'google_service_account',
        { email: SA },
      ]);

      expect(checker.resources.get(`sa:${SA}`).refs).toEqual([
        {
          repo: 'extenda/tf-infra-gcp',
          file: 'organization/iam.hcl',
          url: blob('extenda/tf-infra-gcp', 'organization/iam.hcl', 'head-sha'),
          lines: [12, 30],
          kind: 'code',
          note: 'still referenced here. Forgotten?',
        },
        {
          repo: 'extenda/tf-infra-gcp',
          file: 'organization/notes.hcl',
          url: blob(
            'extenda/tf-infra-gcp',
            'organization/notes.hcl',
            'head-sha',
          ),
          lines: [3],
          kind: 'comment',
          note: 'still referenced here. Forgotten?',
        },
      ]);
      // The checkout replaces code search for the commented repository.
      expect(octokit.rest.repos.getContent).not.toHaveBeenCalled();
    });

    test('It reads the pull request head if the checkout is another repository', async () => {
      mockGitGrep('', 'git@github.com:extenda/tf-infra-gcp-other.git');
      mockSearch(octokit, {
        'api.example.com': [
          searchItem(
            'extenda/tf-infra-gcp',
            'dns/records.tf',
            'name = "api.example.com."',
          ),
          searchItem(
            'extenda/tf-infra-gcp',
            'dns/removed.tf',
            'name = "api.example.com."',
          ),
          searchItem(
            'extenda/tf-infra-gcp',
            'dns/changed.tf',
            'name = "api.example.com."',
          ),
        ],
      });
      mockFiles(octokit, {
        [`extenda/tf-infra-gcp@${PR_HEAD}:dns/records.tf`]:
          'a\nname = "api.example.com."\n',
        [`extenda/tf-infra-gcp@${PR_HEAD}:dns/changed.tf`]:
          'name = "other.example.com."\n',
      });
      const checker = await run(octokit, [
        'google_dns_record_set',
        { name: 'api.example.com.' },
      ]);

      expect(exec.exec).not.toHaveBeenCalledWith(
        'git',
        expect.arrayContaining(['grep']),
        expect.anything(),
      );
      expect(checker.resources.get('dns:api.example.com').refs).toEqual([
        {
          repo: 'extenda/tf-infra-gcp',
          file: 'dns/records.tf',
          url: blob('extenda/tf-infra-gcp', 'dns/records.tf', 'head-sha'),
          lines: [2],
          kind: 'code',
          note: 'still referenced here. Forgotten?',
        },
      ]);
    });

    test('It relies on the code search fragment if a file can not be read', async () => {
      mockSearch(octokit, {
        [SA]: [
          searchItem('extenda/a', 'a.ts', `// uses ${SA}`),
          searchItem('extenda/b', 'b.ts'),
        ],
      });
      const checker = await run(octokit, [
        'google_service_account',
        { email: SA },
      ]);

      expect(
        checker.resources
          .get(`sa:${SA}`)
          .refs.map(({ repo, lines, kind }) => [repo, lines, kind]),
      ).toEqual([
        ['extenda/a', [], 'comment'],
        ['extenda/b', [], 'code'],
      ]);
    });

    test('It reports a failed code search', async () => {
      octokit.rest.search.code.mockRejectedValue(
        Object.assign(new Error('rate limited'), { status: 403 }),
      );
      const checker = await run(octokit, [
        'google_service_account',
        { email: SA },
      ]);

      const sa = checker.resources.get(`sa:${SA}`);
      expect(sa.inUse).toBe(false);
      expect(sa.failed).toBe('code search failed: 403');
    });

    test('It warns if the pull request is behind its base branch', async () => {
      octokit.rest.repos.compareCommitsWithBasehead.mockResolvedValue({
        data: {
          ahead_by: 3,
          files: [
            {
              patch: `@@ -1 +1,2 @@\n members = []\n+  "serviceAccount:${SA}",`,
            },
          ],
        },
      });
      const checker = await run(
        octokit,
        ['google_service_account', { email: SA }],
        ['google_dns_record_set', { name: 'api.example.com.' }],
      );

      expect(
        octokit.rest.repos.compareCommitsWithBasehead,
      ).toHaveBeenCalledWith({
        owner: 'extenda',
        repo: 'tf-infra-gcp',
        basehead: 'head-sha...master',
      });
      expect(checker.resources.get(`sa:${SA}`).findings).toEqual([
        {
          level: ':warning:',
          text: 'Added on master after this pull request branched off. The plan destroys it because the branch is behind.',
        },
      ]);
      expect(checker.resources.get(`sa:${SA}`).inUse).toBe(true);
      expect(checker.resources.get('dns:api.example.com').inUse).toBe(false);
      expect(core.warning).toHaveBeenCalledWith(
        'This pull request is 3 commit(s) behind master. The plans could also add/destroy resources added/destroyed there since. Update the branch and plan again before applying.',
      );
      expect(checker.behind).toBe(
        ':warning: **This pull request is 3 commit(s) behind master. The plans could also add/destroy resources added/destroyed there since. Update the branch and plan again <ins>before</ins> applying.**',
      );
      expect(checker.render().join('\n')).not.toContain('behind master');
    });
  });

  describe('Render', () => {
    test('It renders a removed service with one list of findings', async () => {
      mockGitGrep(
        [
          'HEAD:organization/extendaretail-com/departments/product-development/experience/clans/eva/prod/project.yaml:53:  - name: my-service',
          'HEAD:organization/extendaretail-com/departments/product-development/experience/clans/eva/staging/project.yaml:53:  - name: my-service',
          '',
        ].join('\n'),
      );
      mockSearch(octokit, {
        'my-service': [
          searchItem('extenda/gateway', 'nginx.conf', 'my-service'),
          searchItem('extenda/ui', 'src/base.ts', 'my-service'),
          searchItem(
            'extenda/experience-eva-common',
            'infra/prod/monitoring/alerts/adapter.yaml',
            'my-service',
          ),
          searchItem(
            'extenda/experience-eva-common',
            'infra/prod/monitoring/alerts/cloudrun.yaml',
            'my-service',
          ),
          searchItem(
            'extenda/experience-eva-common',
            'infra/staging/monitoring/alerts/adapter.yaml',
            'my-service',
          ),
        ],
        'my-service.retailsvc.com': [
          searchItem(
            'extenda/gateway',
            'nginx.conf',
            'my-service.retailsvc.com',
          ),
          searchItem('extenda/docs', 'guide.md', 'my-service.retailsvc.com'),
        ],
      });
      mockFiles(octokit, {
        'extenda/gateway:nginx.conf': [
          'upstream my-service {',
          '  server my-service.retailsvc.com;',
          '}',
          'location /a { proxy_pass http://my-service; }',
          'location /b { proxy_pass http://my-service; }',
          'location /c { proxy_pass http://my-service; }',
          'location /d { proxy_pass http://my-service; }',
        ].join('\n'),
        'extenda/ui:src/base.ts': '// Routed through my-service\n',
        'extenda/docs:guide.md': 'Call my-service.retailsvc.com\n',
      });
      const checker = newChecker(octokit);
      await checker.collect(
        [
          {
            module:
              'extendaretail-com/departments/product-development/experience/clans/eva/prod',
            plan: 'organization/extendaretail-com/departments/product-development/experience/clans/eva/prod/plan.out',
            output: 'Plan: 0 to add, 0 to change, 1 to destroy.',
          },
          {
            module:
              'extendaretail-com/departments/product-development/experience/clans/eva/staging',
            plan: 'organization/extendaretail-com/departments/product-development/experience/clans/eva/staging/plan.out',
            output: 'Plan: 0 to add, 0 to change, 1 to destroy.',
          },
        ],
        vi
          .fn()
          .mockResolvedValue(
            destroyPlan([
              'github_actions_secret',
              { repository: 'my-service' },
            ]),
          ),
      );
      await checker.check();

      expect(checker.render().join('\n'))
        .toEqual(`**1 of 1 removed service may still be in use.** Verify them <ins>before</ins> applying.

#### :red_circle: my-service

<details>
<summary>Findings ( 8 )</summary>

<pre>
<a href="${blob('extenda/tf-infra-gcp', 'organization/extendaretail-com/departments/product-development/experience/clans/eva/prod/project.yaml', 'head-sha')}">extendaretail-com/departments/product-development/experience/clans/eva/prod/project.yaml</a>
<a href="${blob('extenda/tf-infra-gcp', 'organization/extendaretail-com/departments/product-development/experience/clans/eva/staging/project.yaml', 'head-sha')}">extendaretail-com/departments/product-development/experience/clans/eva/staging/project.yaml</a>
<a href="${blob('extenda/experience-eva-common', 'infra/prod/monitoring/alerts/adapter.yaml')}">extenda/experience-eva-common/infra/prod/monitoring/alerts/adapter.yaml</a>
<a href="${blob('extenda/experience-eva-common', 'infra/prod/monitoring/alerts/cloudrun.yaml')}">extenda/experience-eva-common/infra/prod/monitoring/alerts/cloudrun.yaml</a>
<a href="${blob('extenda/experience-eva-common', 'infra/staging/monitoring/alerts/adapter.yaml')}">extenda/experience-eva-common/infra/staging/monitoring/alerts/adapter.yaml</a>
<a href="${blob('extenda/gateway', 'nginx.conf')}">extenda/gateway/nginx.conf</a>
<a href="${blob('extenda/ui', 'src/base.ts')}">extenda/ui/src/base.ts</a>
<a href="${blob('extenda/docs', 'guide.md')}">extenda/docs/guide.md</a>
</pre>

</details>
`);
    });

    test('It lists each file and failed check once per service', async () => {
      octokit.rest.search.code.mockImplementation(async ({ q }) => {
        if (q.startsWith('"my-service.retailsvc.dev"')) {
          throw Object.assign(new Error('rate limited'), { status: 403 });
        }
        const items = q.startsWith('"my-service')
          ? [searchItem('extenda/gateway', 'nginx.conf', 'my-service')]
          : [];
        return { data: { items, total_count: items.length } };
      });
      mockFiles(octokit, {
        'extenda/gateway:nginx.conf':
          'upstream my-service {\n  server my-service.retailsvc.com;\n}\n',
      });

      const checker = await runWithEnvironments(
        octokit,
        ['prod', 'staging'],
        ['github_actions_secret', { repository: 'my-service' }],
      );

      const comment = checker.render().join('\n');
      expect(comment.match(/<summary>/g)).toHaveLength(1);
      expect(comment).toContain('<summary>Findings ( 1 )</summary>');
      expect(comment.match(/extenda\/gateway\/nginx\.conf/g)).toHaveLength(1);
      expect(
        comment.match(
          /my-service\.retailsvc\.dev: not able to check, please check manually \(code search failed: 403\)/g,
        ),
      ).toHaveLength(1);
    });

    test('It renders a removed service without findings in orange', async () => {
      mockSearch(octokit, {});

      const checker = await runWithEnvironments(
        octokit,
        ['prod', 'staging'],
        ['github_actions_secret', { repository: 'my-service' }],
      );

      expect(checker.render().join('\n'))
        .toEqual(`No usage found for 1 removed service.

#### :orange_circle: my-service

No findings, make also sure that no customers are using your resource.
`);
    });

    test('It renders a removed service with only failed checks in red', async () => {
      octokit.rest.search.code.mockImplementation(async ({ q }) => {
        if (q.startsWith('"my-service.retailsvc.com"')) {
          throw Object.assign(new Error('rate limited'), { status: 403 });
        }
        return { data: { items: [], total_count: 0 } };
      });

      const checker = await runWithEnvironments(
        octokit,
        ['prod', 'staging'],
        ['github_actions_secret', { repository: 'my-service' }],
      );

      const comment = checker.render().join('\n');
      expect(comment).toContain('#### :red_circle: my-service');
      expect(comment).not.toContain(':orange_circle:');
      expect(comment).not.toContain('No findings');
      expect(comment).toContain('<summary>Findings ( 0 )</summary>');
      expect(comment).not.toContain('<pre>');
      expect(comment).toContain(
        'my-service.retailsvc.com: not able to check, please check manually (code search failed: 403)',
      );
    });

    test('It lists usage before mentions in the findings', async () => {
      mockSearch(octokit, {
        'my-service': [
          searchItem('extenda/a-docs', 'guide.md', 'my-service'),
          searchItem('extenda/b-comment', 'main.ts', 'my-service'),
          searchItem('extenda/c-code', 'main.ts', 'my-service'),
        ],
      });
      mockFiles(octokit, {
        'extenda/a-docs:guide.md': 'Call my-service\n',
        'extenda/b-comment:main.ts': '// Routed through my-service\n',
        'extenda/c-code:main.ts': "const url = 'my-service';\n",
      });

      const checker = await runWithEnvironments(
        octokit,
        ['prod', 'staging'],
        ['github_actions_secret', { repository: 'my-service' }],
      );

      expect(checker.render().join('\n')).toContain(`<pre>
<a href="${blob('extenda/c-code', 'main.ts')}">extenda/c-code/main.ts</a>
<a href="${blob('extenda/b-comment', 'main.ts')}">extenda/b-comment/main.ts</a>
<a href="${blob('extenda/a-docs', 'guide.md')}">extenda/a-docs/guide.md</a>
</pre>`);
    });

    test('It renders a removed service with only mentions in orange', async () => {
      mockSearch(octokit, {
        'my-service': [searchItem('extenda/docs', 'guide.md', 'my-service')],
      });
      mockFiles(octokit, {
        'extenda/docs:guide.md': 'Call my-service\n',
      });

      const checker = await runWithEnvironments(
        octokit,
        ['prod', 'staging'],
        ['github_actions_secret', { repository: 'my-service' }],
      );

      expect(checker.render().join('\n'))
        .toEqual(`No usage found for 1 removed service.

#### :orange_circle: my-service

<details>
<summary>Findings ( 1 )</summary>

<pre>
<a href="${blob('extenda/docs', 'guide.md')}">extenda/docs/guide.md</a>
</pre>

</details>
`);
    });

    test('It counts a removed service with a failed check as maybe in use', async () => {
      octokit.rest.search.code.mockRejectedValue(
        Object.assign(new Error('forbidden'), { status: 403 }),
      );

      const checker = await runWithEnvironments(
        octokit,
        ['prod', 'staging'],
        ['github_actions_secret', { repository: 'my-service' }],
      );

      expect(checker.render()[0]).toBe(
        '**1 of 1 removed service may still be in use.** Verify them <ins>before</ins> applying.',
      );
    });

    test('It tells when only repositories visible to github-token are searched', async () => {
      mockSearch(octokit, {});
      const checker = new DestroyedResources(octokit, {
        org: 'extenda',
        repository: 'extenda/tf-infra-gcp',
        pullRequestNumber: 42,
        searchInterval: 0,
        fallbackToken: true,
      });
      await checker.collect(
        outputs,
        vi
          .fn()
          .mockResolvedValue(
            destroyPlan(['google_service_account', { email: SA }]),
          ),
      );
      await checker.check();

      expect(checker.render().slice(0, 4)).toEqual([
        'No usage found for 1 other destroyed resource.',
        '',
        'Searched only repositories visible to github-token; set check-destroyed-resources-token for an org-wide search.',
        '',
      ]);
      expect(
        (await run(octokit, ['google_service_account', { email: SA }]))
          .render()
          .join('\n'),
      ).not.toContain('Searched only');
    });

    test('It renders other destroyed resources and failed checks', async () => {
      octokit.rest.search.code.mockImplementation(async ({ q }) => {
        if (q.startsWith('"api.example.com"')) {
          throw Object.assign(new Error('rate limited'), { status: 403 });
        }
        return { data: { items: [], total_count: 0 } };
      });
      const checker = await run(
        octokit,
        ['google_service_account', { email: SA }],
        ['google_dns_record_set', { name: 'api.example.com.' }],
      );

      expect(checker.render().join('\n'))
        .toEqual(`No usage found for 2 other destroyed resources.

Other destroyed resources: 0 service, 0 dns, 0 sa, 0 doc/comment, 1 not able to check, please check manually (code search failed: 403)
`);
    });

    test('It marks more files than code search returned', async () => {
      octokit.rest.search.code.mockResolvedValue({
        data: {
          items: [searchItem('extenda/a', 'a.ts')],
          total_count: 150,
        },
      });
      const checker = await run(octokit, [
        'google_service_account',
        { email: SA },
      ]);

      expect(checker.render().join('\n')).toContain(
        '<summary>Other destroyed resources: 0 service, 0 dns, 1+ sa, 0+ doc/comment</summary>',
      );
    });

    test('It renders nothing without destroyed resources', async () => {
      const checker = newChecker(octokit);
      await checker.collect(outputs, vi.fn().mockResolvedValue(destroyPlan()));
      expect(checker.render()).toBeNull();
    });
  });
});
