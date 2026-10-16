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
  octokit.rest.repos.getContent.mockImplementation(
    async ({ owner, repo, path, ref }) => {
      const key = `${owner}/${repo}${ref ? `@${ref}` : ''}:${path}`;
      if (key in files) {
        return { data: files[key] };
      }
      if (!ref && path.endsWith('cloud-deploy.yaml')) {
        return { data: deployYaml };
      }
      throw notFound();
    },
  );
};

const mockOctokit = () => {
  const octokit = {
    paginate: vi.fn(async (method, params) => (await method(params)).data),
    rest: {
      pulls: {
        get: vi.fn().mockResolvedValue({
          data: { base: { ref: 'master' }, head: { sha: 'head-sha' } },
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
        compareCommitsWithBasehead: vi
          .fn()
          .mockResolvedValue({ data: { ahead_by: 0, files: [] } }),
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

const blob = (repo, path) => `https://github.com/${repo}/blob/sha/${path}`;

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
        'Repository extenda/gone is removed by this pull request, but could not be read (404).',
      );
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
  });

  describe('Check', () => {
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
      const checker = await run(octokit, [
        'github_actions_secret',
        { repository: 'my-service' },
      ]);

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
          lines: [12, 30],
          kind: 'code',
          note: 'still referenced here. Forgotten?',
        },
        {
          repo: 'extenda/tf-infra-gcp',
          file: 'organization/notes.hcl',
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
          url: undefined,
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
        'This pull request is 3 commit(s) behind master. The plans also destroy resources added there since. Update the branch and plan again before applying.',
      );
    });
  });

  describe('Render', () => {
    test('It renders a removed service as one list of files', async () => {
      mockGitGrep(
        `HEAD:organization/prod/project.yaml:53:  - name: my-service\n`,
      );
      mockSearch(octokit, {
        'my-service': [
          searchItem('extenda/gateway', 'nginx.conf', 'my-service'),
          searchItem('extenda/ui', 'src/base.ts', 'my-service'),
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
      const checker = await run(octokit, [
        'github_actions_secret',
        { repository: 'my-service' },
      ]);

      expect(checker.render().join('\n'))
        .toEqual(`**1 of 1 removed service may still be in use.** Verify them <ins>before</ins> applying.

<details>
<summary>my-service: 2 service, 1 dns, 0 sa, 2 doc/comment</summary>

<pre>
extenda/tf-infra-gcp/organization/prod/project.yaml (still referenced here. Forgotten?)
<a href="${blob('extenda/gateway', 'nginx.conf')}">extenda/gateway/nginx.conf</a>
<a href="${blob('extenda/ui', 'src/base.ts')}">extenda/ui/src/base.ts</a>
<a href="${blob('extenda/docs', 'guide.md')}">extenda/docs/guide.md</a>
</pre>

</details>
`);
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

Other destroyed resources: 0 service, 0 dns, 0 sa, 0 doc/comment, 1 not checked (code search failed: 403)
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
