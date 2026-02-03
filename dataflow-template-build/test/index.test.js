import { afterEach, describe, expect, test, vi } from 'vitest';
vi.mock('@actions/core');
vi.mock('../src/dataflow-build.js');
vi.mock('../../setup-gcloud/src/index.js');

import * as core from '@actions/core';

import { setupGcloud } from '../../setup-gcloud/src/index.js';
import dataflowBuild from '../src/dataflow-build.js';
import action from '../src/index.js';

describe('Dataflow Build Action', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  test('It can run the action', async () => {
    setupGcloud.mockReturnValueOnce('test-project');
    core.getInput
      .mockReturnValueOnce('service-account')
      .mockReturnValueOnce('gs://test/dataflow/template.json')
      .mockReturnValueOnce('gcr.io/project/image:tag')
      .mockReturnValueOnce('JAVA')
      .mockReturnValueOnce('metadata.json')
      .mockReturnValueOnce('code.jar')
      .mockReturnValueOnce('key=value');
    await action();

    expect(core.getInput).toHaveBeenCalledTimes(7);
    expect(dataflowBuild).toHaveBeenCalledWith(
      'metadata.json',
      'gs://test/dataflow/template.json',
      'JAVA',
      'gcr.io/project/image:tag',
      'code.jar',
      'key=value',
    );
  });

  test('It can run the action without optional tags', async () => {
    core.getInput
      .mockReturnValueOnce('service-account')
      .mockReturnValueOnce('gs://test/dataflow/template.json')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('gcr.io/project/image:tag')
      .mockReturnValueOnce('JAVA')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('');
    await action();

    expect(core.getInput).toHaveBeenCalledTimes(7);
    expect(dataflowBuild).toHaveBeenCalledWith(
      'JAVA',
      'gs://test/dataflow/template.json',
      'gcr.io/project/image:tag',
      '',
      '',
      '',
    );
  });
});
