jest.mock('../src/get-revision');
jest.mock('../src/gcloud-output');
const exec = require('@actions/exec');
const core = require('@actions/core');
const waitForRevision = require('../src/wait-revision');
const getLatestRevision = require('../src/get-revision');

jest.mock('@actions/exec');

const GCLOUD_ERROR_MSG_NODE_SCALING = `
Deploying container to Cloud Run for Anthos service [xxxxxxx] in namespace [default] of cluster [k8s-cluster]
Deploying...
Creating Revision.................failed
Deployment failed
ERROR: (gcloud.run.deploy) Revision "xxxxxxx-00013-loc" failed with message: 0/3 nodes are available: 3 Insufficient cpu..
`;

const GCLOUD_ERROR_MSG_RECONCILIATION = `
Deploying container to Cloud Run for Anthos service [xxxxxxx] in namespace [default] of cluster [k8s-cluster]
Deploying...
Creating Revision.................failed
Deployment failed
ERROR: (gcloud.run.deploy) Ingress reconciliation failed
`;

const GCLOUD_ERROR_MSG_READY_REVISIONS = `
Deploying container to Cloud Run for Anthos service [xxxxxxx] in namespace [default] of cluster [k8s-cluster]
Deploying...
Creating Revision.................failed
Deployment failed
ERROR: (gcloud.run.deploy) Configuration "test-service" does not have any ready Revision.
`;

const GCLOUD_ERROR_MSG_IMAGE_FETCH = `
Deploying container to Cloud Run for Anthos service [xxxxxxx] in namespace [default] of cluster [k8s-cluster]
Deploying...
Creating Revision.................failed
Deployment failed
ERROR: (gcloud.run.deploy) Revision "xxxxxxx-00083-hox" failed with message: Unable to fetch image "eu.gcr.io/extenda/xxxxxxx:1.45.0": failed to resolve image to digest: Get "https://eu.gcr.io/v2/extenda/xxxxxxx/manifests/1.45.0": context deadline exceeded.
`;

const GCLOUD_ARGS = [
  '--platform=gke',
  '--cluster=k8s-cluster',
  '--project=test',
  '--cluster-location=europe-west1',
  '--namespace=test',
];

const clusterInput = {
  project: 'project-id',
  cluster: 'k8s-cluster',
  clusterLocation: 'europe-west1',
};

const canarySpec = {
  enabled: false,
  steps: '10,50,80',
  intervall: 10,
  thresholds: {
    latency99: '5',
    latency95: '2',
    latency50: '1',
    'error-rate': '1',
  },
};

let debugSpy;

describe('Wait for revision', () => {
  beforeEach(() => {
    // Reduce noise in the tests.
    debugSpy = jest.spyOn(core, 'debug').mockImplementation(() => {});
  });
  afterEach(() => {
    debugSpy.mockRestore();
    jest.resetAllMocks();
  });

  test('Wait for revision success', async () => {
    const revisionStatus = {
      status: {
        conditions: [
          {
            lastTransitionTime: '2020-08-31T09:45:11Z',
            severity: 'Info',
            status: 'True',
            type: 'Active',
          },
          {
            lastTransitionTime: '2020-08-31T09:45:11Z',
            status: 'True',
            type: 'ContainerHealthy',
          },
          {
            lastTransitionTime: '2020-08-31T09:45:11Z',
            status: 'True',
            type: 'Ready',
          },
          {
            lastTransitionTime: '2020-08-31T09:45:11Z',
            status: 'True',
            type: 'ResourcesAvailable',
          },
        ],
      },
    };
    exec.exec.mockImplementationOnce((cmd, args, opts) => {
      opts.listeners.stdout(
        Buffer.from(JSON.stringify(revisionStatus), 'utf8'),
      );
      return Promise.resolve(0);
    });
    const response = await waitForRevision(
      { status: 1, output: GCLOUD_ERROR_MSG_NODE_SCALING },
      GCLOUD_ARGS,
      'service-name',
      clusterInput,
      canarySpec,
      10,
    );
    expect(response).toEqual(0);
    expect(exec.exec).toHaveBeenCalled();
  });

  test('It returns immediately for successful deploy', async () => {
    const response = await waitForRevision(
      { status: 0, output: '' },
      GCLOUD_ARGS,
      'service-name',
      clusterInput,
      canarySpec,
    );
    expect(response).toEqual(0);
    expect(exec.exec).not.toHaveBeenCalled();
  });

  test('It does not wait for managed cloud run', async () => {
    await expect(
      waitForRevision(
        { status: 1, output: GCLOUD_ERROR_MSG_NODE_SCALING },
        ['--platform=managed'],
        10,
      ),
    ).rejects.toEqual(new Error('Wait is not supported for managed cloud run'));
    expect(exec.exec).not.toHaveBeenCalled();
  });

  test('It fails on unrecognized deployment error (no wait)', async () => {
    await expect(
      waitForRevision(
        {
          status: 1,
          output: 'ERROR: Unexpected error for revision: "abc-123"',
        },
        GCLOUD_ARGS,
        'service-name',
        clusterInput,
        canarySpec,
        10,
      ),
    ).rejects.toEqual(new Error('Deploy failed for unknown reasons'));
    expect(exec.exec).not.toHaveBeenCalled();
  });

  test('It fails on bad JSON', async () => {
    exec.exec.mockImplementationOnce((cmd, args, opts) => {
      opts.listeners.stdout(Buffer.from('ERROR: No JSON', 'utf8'));
      return Promise.resolve(0);
    });
    await expect(
      waitForRevision(
        { status: 1, output: GCLOUD_ERROR_MSG_NODE_SCALING },
        GCLOUD_ARGS,
        'service-name',
        clusterInput,
        canarySpec,
        10,
      ),
    ).rejects.toEqual(
      new Error(
        'Invalid JSON: Failed to load status for revision "xxxxxxx-00013-loc". Reason: Unexpected token \'E\', "ERROR: No JSON" is not valid JSON',
      ),
    );
    expect(exec.exec).toHaveBeenCalled();
  });

  test('It times out after X minutes', async () => {
    const revisionStatus = {
      status: {
        conditions: [
          {
            lastTransitionTime: '2020-08-31T09:45:11Z',
            severity: 'Info',
            status: 'False',
            type: 'Active',
          },
          {
            lastTransitionTime: '2020-08-31T09:45:11Z',
            status: 'True',
            type: 'ContainerHealthy',
          },
          {
            lastTransitionTime: '2020-08-31T09:45:11Z',
            status: 'True',
            type: 'Ready',
          },
          {
            lastTransitionTime: '2020-08-31T09:45:11Z',
            status: 'True',
            type: 'ResourcesAvailable',
          },
        ],
      },
    };
    exec.exec.mockImplementation((cmd, args, opts) => {
      opts.listeners.stdout(
        Buffer.from(JSON.stringify(revisionStatus), 'utf8'),
      );
      return Promise.resolve(0);
    });
    await expect(
      waitForRevision(
        { status: 1, output: GCLOUD_ERROR_MSG_NODE_SCALING },
        GCLOUD_ARGS,
        'service-name',
        clusterInput,
        canarySpec,
        10,
        100,
      ),
    ).rejects.toEqual(
      new Error('Timed out after while for revision "xxxxxxx-00013-loc".'),
    );
    expect(exec.exec.mock.calls.length).toBeGreaterThan(1);
  });

  test('It fails fast if ExitCode is set as reason', async () => {
    const revisionStatus = {
      status: {
        conditions: [
          {
            lastTransitionTime: '2020-08-31T09:45:11Z',
            severity: 'Info',
            status: 'False',
            type: 'Active',
          },
          {
            lastTransitionTime: '2020-08-31T09:45:11Z',
            status: 'True',
            type: 'ContainerHealthy',
          },
          {
            lastTransitionTime: '2020-08-31T09:45:11Z',
            status: 'False',
            message: 'Container failed with: failed to access secret...',
            reason: 'ExitCode60',
            type: 'Ready',
          },
          {
            lastTransitionTime: '2020-08-31T09:45:11Z',
            status: 'True',
            type: 'ResourcesAvailable',
          },
        ],
      },
    };
    exec.exec.mockImplementation((cmd, args, opts) => {
      opts.listeners.stdout(
        Buffer.from(JSON.stringify(revisionStatus), 'utf8'),
      );
      return Promise.resolve(0);
    });
    await expect(
      waitForRevision(
        { status: 1, output: GCLOUD_ERROR_MSG_NODE_SCALING },
        GCLOUD_ARGS,
        'service-name',
        clusterInput,
        canarySpec,
        10,
      ),
    ).rejects.toEqual(
      new Error(
        'Revision failed "ready" condition with reason: ExitCode60\nContainer failed with: failed to access secret...',
      ),
    );
    expect(exec.exec).toHaveBeenCalled();
  });

  test('It waits on image fetch', async () => {
    const revisionStatus = {
      status: {
        conditions: [
          {
            lastTransitionTime: '2020-08-31T09:45:11Z',
            severity: 'Info',
            status: 'True',
            type: 'Active',
          },
          {
            lastTransitionTime: '2020-08-31T09:45:11Z',
            status: 'True',
            type: 'ContainerHealthy',
          },
          {
            lastTransitionTime: '2020-08-31T09:45:11Z',
            status: 'True',
            type: 'Ready',
          },
          {
            lastTransitionTime: '2020-08-31T09:45:11Z',
            status: 'True',
            type: 'ResourcesAvailable',
          },
        ],
      },
    };
    exec.exec.mockImplementationOnce((cmd, args, opts) => {
      opts.listeners.stdout(
        Buffer.from(JSON.stringify(revisionStatus), 'utf8'),
      );
      return Promise.resolve(0);
    });
    const response = await waitForRevision(
      { status: 1, output: GCLOUD_ERROR_MSG_IMAGE_FETCH },
      GCLOUD_ARGS,
      'service-name',
      clusterInput,
      canarySpec,
      10,
    );
    expect(response).toEqual(0);
    expect(exec.exec).toHaveBeenCalled();
  });

  test('It waits on ingress reconcilliation', async () => {
    const revisionStatus = {
      status: {
        conditions: [
          {
            lastTransitionTime: '2020-08-31T09:45:11Z',
            severity: 'Info',
            status: 'True',
            type: 'Active',
          },
          {
            lastTransitionTime: '2020-08-31T09:45:11Z',
            status: 'True',
            type: 'ContainerHealthy',
          },
          {
            lastTransitionTime: '2020-08-31T09:45:11Z',
            status: 'True',
            type: 'Ready',
          },
          {
            lastTransitionTime: '2020-08-31T09:45:11Z',
            status: 'True',
            type: 'ResourcesAvailable',
          },
        ],
      },
    };
    getLatestRevision.mockResolvedValueOnce('service-revision');
    exec.exec.mockImplementationOnce((cmd, args, opts) => {
      opts.listeners.stdout(
        Buffer.from(JSON.stringify(revisionStatus), 'utf8'),
      );
      return Promise.resolve(0);
    });
    const response = await waitForRevision(
      { status: 1, output: GCLOUD_ERROR_MSG_RECONCILIATION },
      GCLOUD_ARGS,
      'service-name',
      clusterInput,
      canarySpec,
      10,
      100,
    );
    expect(response).toEqual(0);
    expect(exec.exec).toHaveBeenCalled();
  });

  test('It waits on ready revisions', async () => {
    const revisionStatus = {
      status: {
        conditions: [
          {
            lastTransitionTime: '2020-08-31T09:45:11Z',
            severity: 'Info',
            status: 'True',
            type: 'Active',
          },
          {
            lastTransitionTime: '2020-08-31T09:45:11Z',
            status: 'True',
            type: 'ContainerHealthy',
          },
          {
            lastTransitionTime: '2020-08-31T09:45:11Z',
            status: 'True',
            type: 'Ready',
          },
          {
            lastTransitionTime: '2020-08-31T09:45:11Z',
            status: 'True',
            type: 'ResourcesAvailable',
          },
        ],
      },
    };
    getLatestRevision.mockResolvedValueOnce('service-revision');
    exec.exec.mockImplementationOnce((cmd, args, opts) => {
      opts.listeners.stdout(
        Buffer.from(JSON.stringify(revisionStatus), 'utf8'),
      );
      return Promise.resolve(0);
    });
    const response = await waitForRevision(
      { status: 1, output: GCLOUD_ERROR_MSG_READY_REVISIONS },
      GCLOUD_ARGS,
      'test-service',
      clusterInput,
      canarySpec,
      10,
      100,
    );
    expect(response).toEqual(0);
    expect(exec.exec).toHaveBeenCalled();
  });
});
