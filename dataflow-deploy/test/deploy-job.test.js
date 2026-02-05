import { afterEach, describe, expect, test, vi } from 'vitest';
vi.mock('@actions/exec');
import * as exec from '@actions/exec';

import deployJob from '../src/deploy-job.js';

const mockExecListeners = (output) => (cmd, args, opts) => {
  opts.listeners.stdout(Buffer.from(output, 'utf8'));
  return Promise.resolve(0);
};

describe('deploy dataflow job', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  test('deploy flex-template job', async () => {
    const getJob = `job:
  createTime: '2021-02-10T16:39:01.838758Z'
  currentStateTime: '1970-01-01T00:00:00Z'
  id: 2021-02-10_08_39_00-161366295837612
  location: europe-west1
  name: stock-transation-processing-97c642e
  projectId: logistics-staging-e392
  startTime: '2021-02-10T16:39:01.838758Z'
`;
    exec.exec
      .mockImplementationOnce(mockExecListeners("cc: '640'"))
      .mockImplementationOnce(mockExecListeners(getJob));

    await deployJob(
      'job-name-10',
      'test=job-test',
      'dataflow-sa',
      'gs://dataflow-bucket/dataflow/templates/job-name/0.0.1/template.json',
      'europe-west1',
      'test-staging-323',
      'flex-template',
      'gs://dataflow-bucket/dataflow/templates/job-name/0.0.1/staging',
      'tribe-network',
      'clan-resources',
      '4',
      '1',
      'cc=640',
    );
    expect(exec.exec).toHaveBeenCalledTimes(2);
  });

  test('deploy flex-template job without parameters', async () => {
    const getJob = `job:
  createTime: '2021-02-10T16:39:01.838758Z'
  currentStateTime: '1970-01-01T00:00:00Z'
  id: 2021-02-10_08_39_00-161366295837612
  location: europe-west1
  name: stock-transation-processing-97c642e
  projectId: logistics-staging-e392
  startTime: '2021-02-10T16:39:01.838758Z'
`;
    exec.exec
      .mockImplementationOnce(mockExecListeners("cc: '640'"))
      .mockImplementationOnce(mockExecListeners(getJob));

    await deployJob(
      'job-name-10',
      '',
      'dataflow-sa',
      'gs://dataflow-bucket/dataflow/templates/job-name/0.0.1/template.json',
      'europe-west1',
      'test-staging-323',
      'flex-template',
      'gs://dataflow-bucket/dataflow/templates/job-name/0.0.1/staging',
      'tribe-network',
      'clan-resources',
      '',
      '',
      'cc=640',
    );
    expect(exec.exec).toHaveBeenCalledTimes(2);
  });

  test('deploy job', async () => {
    const getJob = `job:
  createTime: '2021-02-10T16:39:01.838758Z'
  currentStateTime: '1970-01-01T00:00:00Z'
  id: 2021-02-10_08_39_00-161366295837612
  location: europe-west1
  name: stock-transation-processing-97c642e
  projectId: logistics-staging-e392
  startTime: '2021-02-10T16:39:01.838758Z'
`;
    exec.exec
      .mockImplementationOnce(mockExecListeners("cc: '640'"))
      .mockImplementationOnce(mockExecListeners(getJob));

    await deployJob(
      'job-name-10',
      '',
      'dataflow-sa',
      'gs://dataflow-templates-europe-west1/latest/Word_Count',
      'europe-west1',
      'test-staging-323',
      'job',
      'gs://dataflow-bucket/dataflow/templates/job-name/0.0.1/staging',
      'tribe-network',
      'clan-resources',
      '',
      '',
      'cc=640',
    );
    expect(exec.exec).toHaveBeenCalledTimes(2);
  });
});
