jest.mock('@actions/exec');

import * as exec from '@actions/exec';

import { addDnsRecord, clearCache } from '../src/dns-record.js';
import { mockOutput } from './utils.js';

describe('DNS record sets', () => {
  afterEach(() => {
    jest.resetAllMocks();
    clearCache();
  });

  test('It can add DNS record', async () => {
    exec.exec.mockImplementation((bin, args, opts) =>
      mockOutput('dns-project', opts),
    );

    await addDnsRecord('dns', 'my-service.test.com', '127.0.0.1');
    expect(exec.exec).toHaveBeenCalledTimes(4);
    expect(exec.exec.mock.calls[0][1]).toEqual([
      'projects',
      'list',
      '--filter=labels:dns',
      '--format=value(PROJECT_ID)',
    ]);
    expect(exec.exec).toHaveBeenNthCalledWith(2, 'gcloud', [
      'dns',
      '--project=dns-project',
      'record-sets',
      'transaction',
      'start',
      '--zone=test-com',
    ]);
    expect(exec.exec).toHaveBeenNthCalledWith(3, 'gcloud', [
      'dns',
      '--project=dns-project',
      'record-sets',
      'transaction',
      'add',
      '127.0.0.1',
      '--name=my-service.test.com',
      '--ttl=300',
      '--type=A',
      '--zone=test-com',
    ]);
    expect(exec.exec).toHaveBeenNthCalledWith(4, 'gcloud', [
      'dns',
      '--project=dns-project',
      'record-sets',
      'transaction',
      'execute',
      '--zone=test-com',
    ]);
  });

  test('It caches DNS project', async () => {
    exec.exec.mockImplementation((bin, args, opts) =>
      mockOutput('dns-project', opts),
    );

    await addDnsRecord('dns', 'my-service.test.dev', '127.0.0.1');
    expect(exec.exec).toHaveBeenCalledTimes(4);

    await addDnsRecord('dns', 'my-service.test.dev', '127.0.0.1');
    expect(exec.exec).toHaveBeenCalledTimes(7);
  });

  test("It skips DNS updates for label 'none'", async () => {
    await addDnsRecord('none', 'my-service.test.com', '127.0.0.1');
    expect(exec.exec).not.toHaveBeenCalled();
  });

  test('It skips DNS updates if DNS project not found', async () => {
    exec.exec
      .mockImplementationOnce((bin, args, opts) => mockOutput('', opts))
      .mockResolvedValue(0);
    await addDnsRecord('not-found', 'my-service.test.com', '127.0.0.1');
    expect(exec.exec).toHaveBeenCalledTimes(1);
  });
});
