import { afterEach, describe, expect, test, vi } from 'vitest';
vi.mock('@actions/exec');
import * as exec from '@actions/exec';

import dataflowBuild from '../src/dataflow-build.js';

describe('Build Dataflow template', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  test('Build template', async () => {
    dataflowBuild(
      'gs://test/dataflow/template.json',
      'gcr.io/project/image:tag',
      'JAVA',
      'metadata.json',
      'code.jar',
      'key=value',
    );
    expect(exec.exec).toHaveBeenCalledTimes(1);
    expect(exec.exec).toHaveBeenCalledWith('gcloud', [
      'dataflow',
      'flex-template',
      'build',
      'gs://test/dataflow/template.json',
      '--image=gcr.io/project/image:tag',
      '--sdk-language=JAVA',
      '--metadata-file=metadata.json',
      '--jar=code.jar',
      '--env=key=value',
    ]);
  });

  test('Build template without optional flags', async () => {
    dataflowBuild(
      'gs://test/dataflow/template.json',
      'gcr.io/project/image:tag',
      'JAVA',
      '',
      '',
      '',
    );
    expect(exec.exec).toHaveBeenCalledTimes(1);
    expect(exec.exec).toHaveBeenCalledWith('gcloud', [
      'dataflow',
      'flex-template',
      'build',
      'gs://test/dataflow/template.json',
      '--image=gcr.io/project/image:tag',
      '--sdk-language=JAVA',
    ]);
  });
});
