// Runs the built action the way a GitHub runner does: `node dist/index.cjs`
// with inputs in the environment. gcloud, docker, trivy, cosign and
// platform-api are fakes, so the run touches no real system.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import yaml from 'yaml';

const here = path.dirname(fileURLToPath(import.meta.url));
const BUNDLE =
  process.env.CLOUD_DEPLOY_BUNDLE || path.resolve(here, '../../dist/index.cjs');
const FAKE_CLI = path.join(here, 'fake-cli.js');
const PRELOAD = path.join(here, 'redirect-platform-api.js');

// The slowest run waits for one platform-api timeout and one rollout poll,
// about 25 seconds. A run that takes longer than this hangs.
const DEPLOY_TIMEOUT_MS = 60000;

// Versions that the action looks up in the tool cache.
const CACHED_TOOLS = { trivy: '0.69.3', cosign: '3.0.5' };

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJson = (file, value) =>
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
const readLines = (file) =>
  fs.existsSync(file)
    ? fs.readFileSync(file, 'utf8').split('\n').filter(Boolean)
    : [];

// A workflow command escapes these characters in its message.
const unescapeCommand = (message) =>
  message
    .replaceAll('%0A', '\n')
    .replaceAll('%0D', '\r')
    .replaceAll('%25', '%');

const installFake = (directory, tool) => {
  fs.mkdirSync(directory, { recursive: true });
  const file = path.join(directory, tool);
  fs.writeFileSync(
    file,
    `#!/bin/sh\nexec "${process.execPath}" "${FAKE_CLI}" ${tool} "$@"\n`,
    { mode: 0o755 },
  );
};

const readBody = async (request) => {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
  }
  return body ? JSON.parse(body) : undefined;
};

/**
 * Start an emulated environment for one Cloud Run service.
 * @param state the service: `revisions` (newest first), `traffic` and `canary`
 * @param canaryStatus how platform-api answers the canary status request:
 *                     'answer', an HTTP status, 'reset' or 'hang'
 * @param trafficStatus the HTTP status of platform-api when the traffic is set
 */
const startEmulation = async ({
  state,
  canaryStatus = 'answer',
  trafficStatus = 200,
}) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cloud-deploy-e2e-'));
  const stateFile = path.join(root, 'state.json');
  const binDirectory = path.join(root, 'bin');
  const toolCache = path.join(root, 'tool-cache');
  const platformApiCalls = [];
  let deployCount = 0;

  writeJson(stateFile, { canary: null, rollout: 'SUCCEEDED', ...state });
  installFake(binDirectory, 'gcloud');
  installFake(binDirectory, 'docker');
  for (const [tool, version] of Object.entries(CACHED_TOOLS)) {
    const toolDirectory = path.join(toolCache, tool, version, os.arch());
    installFake(toolDirectory, tool);
    fs.writeFileSync(`${toolDirectory}.complete`, '');
  }

  const answerCanaryStatus = (request, response) => {
    const { canary } = readJson(stateFile);
    if (canaryStatus === 'hang') {
      return;
    }
    if (canaryStatus === 'reset') {
      request.socket.destroy();
    } else if (canaryStatus !== 'answer') {
      response.writeHead(canaryStatus).end();
    } else if (canary) {
      response.writeHead(200).end(JSON.stringify(canary));
    } else {
      response.writeHead(404).end(
        JSON.stringify({
          statusCode: 404,
          message: 'No canary found for this service',
        }),
      );
    }
  };

  // Setting the traffic also cancels the canary of the service.
  const setTraffic = (revisions) => {
    const current = readJson(stateFile);
    current.traffic = revisions
      .filter(({ trafficPercent }) => trafficPercent > 0)
      .map(({ name, trafficPercent }) => ({
        revisionName: name,
        percent: trafficPercent,
      }));
    if (current.canary?.status === 'in_progress') {
      current.canary.status = 'cancelled';
    }
    writeJson(stateFile, current);
  };

  const registerCanary = (canary) => {
    const current = readJson(stateFile);
    current.canary = {
      id: 1,
      service: canary.service,
      project_id: canary.project,
      region: canary.region,
      revision: canary.revision,
      previous_revision: canary.previousRevision,
      steps: JSON.stringify(canary.steps),
      step_index: -1,
      status: 'in_progress',
    };
    writeJson(stateFile, current);
  };

  const platformApi = http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://platform-api');
    const body = await readBody(request);
    platformApiCalls.push({
      method: request.method,
      path: url.pathname,
      query: Object.fromEntries(url.searchParams),
      body,
      authorization: request.headers.authorization,
      time: Date.now(),
    });
    response.setHeader('Content-Type', 'application/json');

    const route = `${request.method} ${url.pathname}`;
    if (route.startsWith('GET /canary/automatic/')) {
      answerCanaryStatus(request, response);
    } else if (route.startsWith('GET /security/whitelist/')) {
      response.end(JSON.stringify({ whitelisted: false }));
    } else if (route === 'POST /services/revisions' && trafficStatus !== 200) {
      response
        .writeHead(trafficStatus)
        .end(JSON.stringify({ statusCode: trafficStatus }));
    } else if (route === 'POST /services/revisions') {
      setTraffic(body);
      response.end(JSON.stringify({ data: body }));
    } else if (route === 'POST /canary/automatic') {
      registerCanary(body);
      response.writeHead(201).end(JSON.stringify(readJson(stateFile).canary));
    } else {
      response.end('{}');
    }
  });
  await new Promise((resolve) => {
    platformApi.listen(0, '127.0.0.1', resolve);
  });

  /**
   * Run the action once, as one deploy job.
   * @param projectId the project of the CI/CD account; its name sets the environment
   * @param serviceDefinition the content of cloud-deploy.yaml
   * @param cancelAtRollout stop the job while it waits for the rollout
   */
  const deploy = async ({
    projectId,
    serviceDefinition,
    cancelAtRollout = false,
  }) => {
    deployCount += 1;
    const job = path.join(root, `job-${deployCount}`);
    const workspace = path.join(job, 'workspace');
    const runnerTemp = path.join(job, 'temp');
    const cliLog = path.join(job, 'cli.jsonl');
    const refusedLog = path.join(job, 'refused.log');
    const firstCall = platformApiCalls.length;
    fs.mkdirSync(workspace, { recursive: true });
    fs.mkdirSync(runnerTemp, { recursive: true });
    fs.writeFileSync(
      path.join(workspace, 'cloud-deploy.yaml'),
      yaml.stringify(serviceDefinition),
    );
    for (const file of ['env', 'path', 'output', 'state', 'summary']) {
      fs.writeFileSync(path.join(runnerTemp, file), '');
    }
    writeJson(stateFile, {
      ...readJson(stateFile),
      rollout: cancelAtRollout ? 'never-ends' : 'SUCCEEDED',
    });

    const serviceAccountKey = Buffer.from(
      JSON.stringify({
        project_id: projectId,
        private_key: 'not-a-key',
        client_email: `ci-cd-pipeline@${projectId}.iam.gserviceaccount.com`,
      }),
    ).toString('base64');

    const child = spawn(process.execPath, ['--import', PRELOAD, BUNDLE], {
      cwd: workspace,
      // Own process group, so a cancel also stops the tools the action runs.
      detached: true,
      env: {
        // Only the fakes and the system shell tools are on the PATH.
        PATH: `${binDirectory}:/usr/bin:/bin`,
        HOME: job,
        'INPUT_SECRETS-ACCOUNT-KEY': serviceAccountKey,
        'INPUT_SERVICE-ACCOUNT-KEY': serviceAccountKey,
        INPUT_IMAGE: 'registry.example.com/example/my-service:v1.0.0',
        'INPUT_UPDATE-DNS': 'if-missing',
        GITHUB_REF: 'refs/heads/master',
        GITHUB_REPOSITORY: 'example/my-service',
        GITHUB_SERVER_URL: 'https://github.com',
        GITHUB_SHA: '0123456789abcdef0123456789abcdef01234567',
        GITHUB_RUN_ID: '1000',
        GITHUB_RUN_ATTEMPT: '1',
        GITHUB_ENV: path.join(runnerTemp, 'env'),
        GITHUB_PATH: path.join(runnerTemp, 'path'),
        GITHUB_OUTPUT: path.join(runnerTemp, 'output'),
        GITHUB_STATE: path.join(runnerTemp, 'state'),
        GITHUB_STEP_SUMMARY: path.join(runnerTemp, 'summary'),
        RUNNER_TEMP: runnerTemp,
        RUNNER_TOOL_CACHE: toolCache,
        RUNNER_OS: 'Linux',
        RUNNER_ARCH: 'X64',
        // An earlier step of the job has installed gcloud.
        GCLOUD_REQUESTED_VERSION: 'latest',
        GCLOUD_INSTALLED_VERSION: 'fake',
        // Secrets are read from the environment when they are set.
        HTTPS_CERTIFICATES: 'certificates',
        INTERNAL_HTTPS_CERTIFICATES_KEY: 'key',
        INTERNAL_HTTPS_CERTIFICATES_CRT: 'certificate',
        SEC_LAUNCHDARKLY_SDK_KEY: 'sdk-key',
        CLAN_SLACK_CHANNEL: '#example',
        EMULATED_STATE: stateFile,
        EMULATED_CLI_LOG: cliLog,
        EMULATED_REFUSED_LOG: refusedLog,
        EMULATED_PLATFORM_API_PORT: `${platformApi.address().port}`,
      },
    });

    let output = '';
    child.stdout.on('data', (data) => {
      output += data;
    });
    child.stderr.on('data', (data) => {
      output += data;
    });

    const cliCalls = () => readLines(cliLog).map((line) => JSON.parse(line));
    const gcloudCalls = () =>
      cliCalls()
        .filter(({ tool }) => tool === 'gcloud')
        .map(({ args }) => args.join(' '));

    let cancelled = false;
    const cancelTimer = setInterval(() => {
      const waitsForRollout = gcloudCalls().some((call) =>
        call.startsWith('deploy rollouts list'),
      );
      if (cancelAtRollout && waitsForRollout && !cancelled) {
        cancelled = true;
        process.kill(-child.pid, 'SIGKILL');
      }
    }, 100);

    let timedOut = false;
    const deployTimer = setTimeout(() => {
      timedOut = true;
      process.kill(-child.pid, 'SIGKILL');
    }, DEPLOY_TIMEOUT_MS);

    const exitCode = await new Promise((resolve) => {
      child.on('close', resolve);
    });
    clearInterval(cancelTimer);
    clearTimeout(deployTimer);
    if (timedOut) {
      throw new Error(
        `The action did not end within ${DEPLOY_TIMEOUT_MS} ms and was stopped. Output:\n${output}`,
      );
    }

    const released = path.join(workspace, 'released-cloudrun-service.yaml');
    return {
      exitCode,
      cancelled,
      output,
      errors: output
        .split('\n')
        .filter((line) => line.startsWith('::error::'))
        .map((line) => unescapeCommand(line.replace('::error::', ''))),
      gcloud: gcloudCalls(),
      cli: cliCalls(),
      // The traffic of the manifest that Cloud Deploy received.
      releasedTraffic: fs.existsSync(released)
        ? yaml.parse(fs.readFileSync(released, 'utf8')).spec.traffic
        : null,
      platformApi: platformApiCalls.slice(firstCall),
      refusedConnections: readLines(refusedLog),
      state: readJson(stateFile),
    };
  };

  const stop = async () => {
    platformApi.closeAllConnections();
    await new Promise((resolve) => {
      platformApi.close(resolve);
    });
    fs.rmSync(root, { recursive: true, force: true });
  };

  return { deploy, stop };
};

export default startEmulation;
