// Emulated end-to-end runs of the built action (dist/index.cjs).
// Build first, then run: npm run test:e2e --workspace cloud-deploy
import assert from 'node:assert/strict';
import { after, describe, test } from 'node:test';

import startEmulation from './harness.js';

const SERVICE = 'my-service';
const PRODUCTION = 'example-prod-1234';
const STAGING = 'example-staging-1234';
const SERVING = 'my-service-00001-abc';
const IDLE = 'my-service-00002-def';
const NEW_REVISION = 'my-service-00003-new';
const MULTIPLE_ACTIVE =
  '2 active revisions found, set revision to 100% traffic before deploying';

const revisions = [
  { name: IDLE, creationTimestamp: '2026-01-02T10:00:00Z' },
  { name: SERVING, creationTimestamp: '2026-01-01T10:00:00Z' },
];

// One revision serves. The other one has no traffic target.
const oneActive = () => ({
  revisions,
  traffic: [{ revisionName: SERVING, percent: 100 }],
});

// A deploy that withheld traffic has stopped before its canary was registered.
const idleRevisionActive = () => ({
  revisions,
  traffic: [
    { latestRevision: true, revisionName: IDLE, percent: 0 },
    { revisionName: SERVING, percent: 100 },
  ],
});

const trafficSplit = () => ({
  revisions,
  traffic: [
    { revisionName: IDLE, percent: 10 },
    { revisionName: SERVING, percent: 90 },
  ],
});

const canaryRecord = (stepIndex) => ({
  id: 1,
  service: SERVICE,
  project_id: PRODUCTION,
  region: 'europe-west1',
  revision: IDLE,
  previous_revision: SERVING,
  steps: '[10,50,100]',
  step_index: stepIndex,
  status: 'in_progress',
});

const serviceDefinition = (traffic) => ({
  'cloud-run': {
    service: SERVICE,
    resources: { cpu: 1, memory: '512Mi' },
    protocol: 'http',
    scaling: { concurrency: 80 },
    traffic: { 'static-egress-ip': true, ...traffic },
  },
  security: 'none',
  labels: { product: 'actions', component: 'emulated' },
  environments: {
    production: {
      'min-instances': 0,
      'max-instances': 1,
      'domain-mappings': ['my-service.retailsvc.com'],
      env: {},
    },
    staging: {
      'min-instances': 0,
      'max-instances': 1,
      'domain-mappings': ['my-service.retailsvc.dev'],
      env: {},
    },
  },
});

const automaticCanary = serviceDefinition({ canary: { steps: [10, 50] } });
const manualPromotion = serviceDefinition({ 'serve-traffic': false });
const serveTraffic = serviceDefinition({});

const servingRevisionOnly = [{ percent: 100, revisionName: SERVING }];
const latestRevisionOnly = [{ percent: 100, latestRevision: true }];

const emulations = [];
const emulate = async (options) => {
  const emulation = await startEmulation(options);
  emulations.push(emulation);
  return emulation;
};

const callsTo = (result, method, path) =>
  result.platformApi.filter(
    (call) => call.method === method && call.path === path,
  );
const canaryStatusRequests = (result) =>
  callsTo(result, 'GET', `/canary/automatic/${SERVICE}`);
const trafficRequests = (result) =>
  callsTo(result, 'POST', '/services/revisions');
const canaryRegistrations = (result) =>
  callsTo(result, 'POST', '/canary/automatic');
const gcloudCalls = (result, command) =>
  result.gcloud.filter((call) => call.startsWith(command));

const assertSucceeded = (result) => {
  assert.equal(result.exitCode, 0, result.output);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.refusedConnections, []);
  assert.equal(gcloudCalls(result, 'deploy releases create').length, 1);
};

const assertFailedBeforeRelease = (result, message) => {
  assert.equal(result.exitCode, 1, result.output);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], message);
  assert.deepEqual(result.refusedConnections, []);
  assert.deepEqual(gcloudCalls(result, 'deploy'), []);
  assert.equal(result.releasedTraffic, null);
};

const assertCanaryStatusRequest = (result) => {
  const [request] = canaryStatusRequests(result);
  assert.deepEqual(request.query, {
    project: PRODUCTION,
    region: 'europe-west1',
  });
  assert.equal(request.authorization, 'Bearer fake-id-token');
  assert.ok(
    result.gcloud.includes('auth print-identity-token --audiences=platform'),
  );
};

const assertCanaryRegistered = (result, previousRevision) => {
  assert.deepEqual(
    canaryRegistrations(result).map(({ body }) => body),
    [
      {
        project: PRODUCTION,
        service: SERVICE,
        region: 'europe-west1',
        revision: NEW_REVISION,
        previousRevision,
        steps: [10, 50, 100],
        slackChannel: '#example',
      },
    ],
  );
};

// A deploy that hangs is stopped by the harness. This limit is the last guard.
const SCENARIO_TIMEOUT_MS = 180000;

const scenarios = { concurrency: true, timeout: SCENARIO_TIMEOUT_MS };

describe('cloud-deploy, emulated', scenarios, () => {
  after(async () => {
    await Promise.all(emulations.map((emulation) => emulation.stop()));
  });

  test('canary deploy with one active revision and no canary', async () => {
    const emulation = await emulate({ state: oneActive() });

    const result = await emulation.deploy({
      projectId: PRODUCTION,
      serviceDefinition: automaticCanary,
    });

    assertSucceeded(result);
    assert.deepEqual(result.releasedTraffic, servingRevisionOnly);
    assert.equal(canaryStatusRequests(result).length, 1);
    assertCanaryStatusRequest(result);
    assert.deepEqual(trafficRequests(result), []);
    assert.deepEqual(gcloudCalls(result, 'run revisions list --service'), [
      `run revisions list --service=${SERVICE} --project=${PRODUCTION} --region=europe-west1 --format=json`,
      // The same list, read again to clean up old revisions after the deploy.
      `run revisions list --service=${SERVICE} --project=${PRODUCTION} --region=europe-west1 --format=json`,
      `run revisions list --service=${SERVICE} --project=${PRODUCTION} --region=europe-west1 --sort-by=~creationTimestamp --limit=1 --format=value(metadata.name)`,
    ]);
    assertCanaryRegistered(result, SERVING);
    // The new revision has no traffic target, so it is not active.
    assert.deepEqual(result.state.traffic, servingRevisionOnly);
  });

  test('canary in progress that waits for its first step', async () => {
    const emulation = await emulate({
      state: { ...oneActive(), canary: canaryRecord(-1) },
    });

    const result = await emulation.deploy({
      projectId: PRODUCTION,
      serviceDefinition: automaticCanary,
    });

    assertFailedBeforeRelease(
      result,
      new RegExp(
        `^A canary is in progress for revision ${IDLE}, waiting for its first step\\. ` +
          '.*platform UI \\(POST /services/revisions\\): this cancels the canary\\.$',
      ),
    );
    assert.deepEqual(trafficRequests(result), []);
    // The canary is read first, so the revisions are not listed at all.
    assert.deepEqual(gcloudCalls(result, 'run revisions list'), []);
  });

  test('canary in progress that shifts traffic', async () => {
    const emulation = await emulate({
      state: { ...trafficSplit(), canary: canaryRecord(0) },
    });

    const result = await emulation.deploy({
      projectId: PRODUCTION,
      serviceDefinition: automaticCanary,
    });

    assertFailedBeforeRelease(
      result,
      new RegExp(
        `^A canary is in progress for revision ${IDLE}, at step 1 of 3 \\(10% traffic\\)\\.`,
      ),
    );
    assert.deepEqual(trafficRequests(result), []);
    assert.deepEqual(gcloudCalls(result, 'run revisions list'), []);
    assert.deepEqual(gcloudCalls(result, 'run services describe'), []);
  });

  test('repair of an active revision without traffic and without canary', async () => {
    const emulation = await emulate({ state: idleRevisionActive() });

    const result = await emulation.deploy({
      projectId: PRODUCTION,
      serviceDefinition: automaticCanary,
    });

    assertSucceeded(result);
    assertCanaryStatusRequest(result);
    const [repair, ...otherRepairs] = trafficRequests(result);
    assert.deepEqual(otherRepairs, []);
    assert.deepEqual(repair.query, {
      project: PRODUCTION,
      service: SERVICE,
      region: 'europe-west1',
    });
    assert.deepEqual(repair.body, [{ name: SERVING, trafficPercent: 100 }]);
    assert.equal(repair.authorization, 'Bearer fake-id-token');
    assert.match(
      result.output,
      new RegExp(
        `::notice::Found an active revision without traffic.*${SERVING}`,
      ),
    );
    assert.deepEqual(result.releasedTraffic, servingRevisionOnly);
    assertCanaryRegistered(result, SERVING);
  });

  test('repair that platform-api refuses fails with the cause', async () => {
    const emulation = await emulate({
      state: idleRevisionActive(),
      trafficStatus: 500,
    });

    const result = await emulation.deploy({
      projectId: PRODUCTION,
      serviceDefinition: automaticCanary,
    });

    assertFailedBeforeRelease(
      result,
      new RegExp(
        `^${MULTIPLE_ACTIVE}\\. Unable to set 100% traffic to ${SERVING}: Request failed with status code 500$`,
      ),
    );
    assert.equal(trafficRequests(result).length, 1);
    assert.deepEqual(result.state.traffic, idleRevisionActive().traffic);
  });

  test('repair of an active revision whose canary was cancelled', async () => {
    const emulation = await emulate({
      state: {
        ...idleRevisionActive(),
        canary: { ...canaryRecord(-1), status: 'cancelled' },
      },
    });

    const result = await emulation.deploy({
      projectId: PRODUCTION,
      serviceDefinition: automaticCanary,
    });

    assertSucceeded(result);
    assert.deepEqual(
      trafficRequests(result).map(({ body }) => body),
      [[{ name: SERVING, trafficPercent: 100 }]],
    );
    assert.deepEqual(result.releasedTraffic, servingRevisionOnly);
  });

  test('traffic split without a canary', async () => {
    const emulation = await emulate({ state: trafficSplit() });

    const result = await emulation.deploy({
      projectId: PRODUCTION,
      serviceDefinition: automaticCanary,
    });

    assertFailedBeforeRelease(result, new RegExp(`^${MULTIPLE_ACTIVE}$`));
    assert.equal(canaryStatusRequests(result).length, 1);
    assert.deepEqual(trafficRequests(result), []);
  });

  // The canary status is read again twice after a server error or a dropped
  // connection, and once after any other answer.
  const assertCanaryStatusRequests = (result, requests) => {
    assert.equal(canaryStatusRequests(result).length, requests);
    const retryLines = result.output
      .split('\n')
      .filter((line) => line.includes('retrying'));
    assert.deepEqual(
      retryLines,
      Array.from(
        { length: requests - 1 },
        (_, retry) =>
          `Request to platform-api for the canary status failed, retrying (${retry + 1})`,
      ),
    );
    assert.doesNotMatch(result.output, /das sync worker/);
  };

  for (const [name, canaryStatus, requests] of [
    ['answers 503', 503, 3],
    ['answers 403', 403, 1],
    // A 404 that is not in the shape of platform-api tells nothing.
    ['answers 404 with an empty body', 404, 1],
    ['drops the connection', 'reset', 3],
  ]) {
    test(`platform-api ${name}: one active revision deploys`, async () => {
      const emulation = await emulate({ state: oneActive(), canaryStatus });

      const result = await emulation.deploy({
        projectId: PRODUCTION,
        serviceDefinition: automaticCanary,
      });

      assertSucceeded(result);
      assertCanaryStatusRequests(result, requests);
      assert.match(
        result.output,
        /::warning::Unable to read the canary status from platform-api/,
      );
      assert.deepEqual(trafficRequests(result), []);
      assert.deepEqual(result.releasedTraffic, servingRevisionOnly);
      assertCanaryRegistered(result, SERVING);
    });

    test(`platform-api ${name}: two active revisions fail`, async () => {
      const emulation = await emulate({
        state: idleRevisionActive(),
        canaryStatus,
      });

      const result = await emulation.deploy({
        projectId: PRODUCTION,
        serviceDefinition: automaticCanary,
      });

      assertFailedBeforeRelease(result, new RegExp(`^${MULTIPLE_ACTIVE}$`));
      assertCanaryStatusRequests(result, requests);
      assert.deepEqual(trafficRequests(result), []);
    });
  }

  test('platform-api does not answer in time: the deploy goes on', async () => {
    const emulation = await emulate({
      state: oneActive(),
      canaryStatus: 'hang',
    });

    const result = await emulation.deploy({
      projectId: PRODUCTION,
      serviceDefinition: automaticCanary,
    });

    assertSucceeded(result);
    assert.match(
      result.output,
      /::warning::Unable to read the canary status from platform-api: timeout of 10000ms exceeded/,
    );
    // The request is not repeated, so the wait is one timeout.
    assert.equal(canaryStatusRequests(result).length, 1);
    const [canaryStatus] = canaryStatusRequests(result);
    const next = result.cli.find((call) => call.time > canaryStatus.time);
    const waited = next.time - canaryStatus.time;
    assert.ok(waited >= 9500 && waited < 13000, `waited ${waited} ms`);
    assert.deepEqual(result.releasedTraffic, servingRevisionOnly);
  });

  test('manual promotion with two active revisions is not repaired', async () => {
    const emulation = await emulate({ state: idleRevisionActive() });

    const result = await emulation.deploy({
      projectId: PRODUCTION,
      serviceDefinition: manualPromotion,
    });

    assertFailedBeforeRelease(result, new RegExp(`^${MULTIPLE_ACTIVE}$`));
    assert.equal(canaryStatusRequests(result).length, 1);
    assert.deepEqual(trafficRequests(result), []);
    assert.deepEqual(gcloudCalls(result, 'run services describe'), []);
  });

  test('manual promotion with one active revision', async () => {
    const emulation = await emulate({ state: oneActive() });

    const result = await emulation.deploy({
      projectId: PRODUCTION,
      serviceDefinition: manualPromotion,
    });

    assertSucceeded(result);
    assert.deepEqual(result.releasedTraffic, servingRevisionOnly);
    assert.deepEqual(trafficRequests(result), []);
    assert.deepEqual(canaryRegistrations(result), []);
  });

  test('staging serves the latest revision and skips the check', async () => {
    const emulation = await emulate({ state: idleRevisionActive() });

    const result = await emulation.deploy({
      projectId: STAGING,
      serviceDefinition: automaticCanary,
    });

    assertSucceeded(result);
    assert.deepEqual(result.releasedTraffic, latestRevisionOnly);
    assert.deepEqual(canaryStatusRequests(result), []);
    assert.deepEqual(trafficRequests(result), []);
    assert.deepEqual(canaryRegistrations(result), []);
    // The only list of revisions is the cleanup after the release.
    const firstList = result.gcloud.findIndex((call) =>
      call.startsWith('run revisions list'),
    );
    const release = result.gcloud.findIndex((call) =>
      call.startsWith('deploy releases create'),
    );
    assert.ok(firstList > release);
  });

  test('serve-traffic in production serves the latest revision', async () => {
    const emulation = await emulate({ state: idleRevisionActive() });

    const result = await emulation.deploy({
      projectId: PRODUCTION,
      serviceDefinition: serveTraffic,
    });

    assertSucceeded(result);
    assert.deepEqual(result.releasedTraffic, latestRevisionOnly);
    assert.deepEqual(canaryStatusRequests(result), []);
    assert.deepEqual(trafficRequests(result), []);
    assert.deepEqual(canaryRegistrations(result), []);
  });

  test('first deploy without traffic serves the latest revision', async () => {
    const emulation = await emulate({ state: { revisions: [], traffic: [] } });

    const result = await emulation.deploy({
      projectId: PRODUCTION,
      serviceDefinition: manualPromotion,
    });

    assertSucceeded(result);
    assert.equal(canaryStatusRequests(result).length, 1);
    assert.deepEqual(result.releasedTraffic, latestRevisionOnly);
    assert.deepEqual(result.state.traffic, [
      {
        percent: 100,
        latestRevision: true,
        revisionName: 'my-service-00001-new',
      },
    ]);
  });

  test('a cancelled canary deploy does not block the next deploy', async () => {
    const emulation = await emulate({ state: oneActive() });

    const cancelledDeploy = await emulation.deploy({
      projectId: PRODUCTION,
      serviceDefinition: automaticCanary,
      cancelAtRollout: true,
    });

    // The job is gone, but the release was created and no canary registered.
    assert.equal(cancelledDeploy.cancelled, true);
    assert.equal(
      gcloudCalls(cancelledDeploy, 'deploy releases create').length,
      1,
    );
    assert.deepEqual(canaryRegistrations(cancelledDeploy), []);
    assert.equal(cancelledDeploy.state.revisions[0].name, NEW_REVISION);
    assert.deepEqual(cancelledDeploy.state.traffic, servingRevisionOnly);

    const nextDeploy = await emulation.deploy({
      projectId: PRODUCTION,
      serviceDefinition: automaticCanary,
    });

    assertSucceeded(nextDeploy);
    assert.deepEqual(nextDeploy.releasedTraffic, servingRevisionOnly);
    assert.deepEqual(trafficRequests(nextDeploy), []);
    assert.deepEqual(
      canaryRegistrations(nextDeploy).map(({ body }) => [
        body.revision,
        body.previousRevision,
      ]),
      [['my-service-00004-new', SERVING]],
    );
  });
});
