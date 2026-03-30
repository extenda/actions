import axios from 'axios';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { execGcloud } from '../../setup-gcloud/src/index.js';
import configureBundleSync from '../src/configure-bundle-sync.js';

vi.mock('../../setup-gcloud/src/index.js');
vi.mock('axios');

describe('Configure bundle sync', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  const iam = {
    'permission-prefix': 'tst',
    name: 'my-test',
    services: [
      {
        name: 'service1',
        'allowed-consumers': [
          { clan: 'test', 'service-accounts': ['sa1', 'sa2'] },
          { clan: 'test1', 'service-accounts': ['sa1tes1', 'sa2tes2'] },
        ],
      },
      {
        name: 'service2',
      },
    ],
  };

  test('It configures systems and consumers', async () => {
    execGcloud.mockResolvedValueOnce('idToken');
    const mockPut = vi.fn().mockResolvedValueOnce({});
    axios.create.mockReturnValue({ put: mockPut });

    await configureBundleSync(iam, 'prod');
    expect(axios.create).toHaveBeenCalledWith({
      baseURL: 'https://iam-das-worker.retailsvc.com/api/v1',
      headers: { authorization: 'Bearer idToken' },
    });

    expect(execGcloud).toHaveBeenCalledWith([
      'auth',
      'print-identity-token',
      '--audiences=iam-das-worker',
    ]);
    expect(mockPut).toHaveBeenCalledWith('/systems/tst.service1-prod');
    expect(mockPut).toHaveBeenCalledWith('/systems/tst.service2-prod');
    expect(mockPut).toHaveBeenCalledWith(
      '/systems/tst.service1-prod/datasets/consumers',
      {
        services: ['sa1', 'sa2', 'sa1tes1', 'sa2tes2'],
      },
    );
  });

  test('It throws on error', async () => {
    execGcloud.mockResolvedValueOnce('idToken');
    const mockPut = vi.fn().mockRejectedValueOnce(new Error('TEST'));
    axios.create.mockReturnValue({ put: mockPut });

    await expect(configureBundleSync(iam, 'staging')).rejects.toEqual(
      new Error('TEST'),
    );
    expect(mockPut).toHaveBeenCalledTimes(1);
  });
});
