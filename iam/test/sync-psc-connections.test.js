import axios from 'axios';
import { afterEach, describe, expect, test, vi } from 'vitest';

vi.mock('@actions/core');
vi.mock('axios');
vi.mock('setup-gcloud/src/index.js');

import * as core from '@actions/core';
import { getIdToken, setupGcloud } from 'setup-gcloud/src/index.js';

import syncPscConnections from '../src/sync-psc-connections.js';

const iamWithServices = {
  'permission-prefix': 'test',
  services: [
    {
      name: 'service-name1',
      'allowed-consumers': [
        {
          clan: 'clan1',
          'service-accounts': [
            'sa1@consumer-prod-1234.iam.gserviceaccount.com',
          ],
        },
      ],
    },
    {
      name: 'service-name2',
      // no allowed-consumers key — should default to []
    },
  ],
};

describe('syncPscConnections', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  test('does nothing when iam has no services', async () => {
    await syncPscConnections('prod-key', { 'permission-prefix': 'platform' });

    expect(setupGcloud).not.toHaveBeenCalled();
    expect(axios.post).not.toHaveBeenCalled();
  });

  test('posts correctly shaped payload to the prod platform API', async () => {
    setupGcloud.mockResolvedValueOnce('producer-prod-1234');
    getIdToken.mockResolvedValueOnce('id-token');
    const mockPost = vi.fn().mockResolvedValueOnce({ data: [] });
    axios.create.mockReturnValueOnce({ post: mockPost });

    await syncPscConnections('prod-key', iamWithServices);

    expect(setupGcloud).toHaveBeenCalledWith('prod-key');
    expect(getIdToken).toHaveBeenCalledWith('platform');
    expect(axios.create).toHaveBeenCalledWith({
      baseURL: 'https://platform-api.retailsvc.com',
      headers: { authorization: 'Bearer id-token' },
    });
    expect(mockPost).toHaveBeenCalledWith('/internal-connections/sync', {
      'project-id': 'producer-prod-1234',
      services: [
        {
          name: 'service-name1',
          'allowed-consumers': [
            {
              clan: 'clan1',
              'service-accounts': [
                'sa1@consumer-prod-1234.iam.gserviceaccount.com',
              ],
            },
          ],
        },
        {
          name: 'service-name2',
          'allowed-consumers': [],
        },
      ],
    });
  });

  test('logs warnings for failed results and info for successful ones', async () => {
    setupGcloud.mockResolvedValueOnce('producer-prod-1234');
    getIdToken.mockResolvedValueOnce('id-token');
    const mockPost = vi.fn().mockResolvedValueOnce({
      data: [
        { action: 'connected', serviceName: 'service-name1', consumerProjectID: 'consumer-prod-1234', statusCode: 200 },
        { action: 'connected', serviceName: 'service-name1', consumerProjectID: 'consumer-prod-5678', statusCode: 409 },
        { action: 'connected', serviceName: 'service-name1', consumerProjectID: 'consumer-prod-9999', statusCode: 500, message: 'Worker failed' },
      ],
    });
    axios.create.mockReturnValueOnce({ post: mockPost });

    await syncPscConnections('prod-key', iamWithServices);

    expect(core.info).toHaveBeenCalledWith(
      '  PSC connected: service-name1 → consumer-prod-1234',
    );
    expect(core.info).toHaveBeenCalledWith(
      '  PSC connected: service-name1 → consumer-prod-5678',
    );
    expect(core.warning).toHaveBeenCalledWith(
      '  PSC connected failed: service-name1 → consumer-prod-9999: Worker failed',
    );
  });

  test('dry-run fetches current state and logs what would be added and removed', async () => {
    setupGcloud.mockResolvedValueOnce('producer-prod-1234');
    getIdToken.mockResolvedValueOnce('id-token');

    // Current state: service-name1 connected to consumer-prod-1234 (stays),
    // service-name1 connected to consumer-prod-old (will be removed)
    const mockGet = vi.fn().mockResolvedValueOnce({
      data: [
        {
          consumer_projectid: 'consumer-prod-1234',
          services: [{ service_name: 'service-name1' }],
        },
        {
          consumer_projectid: 'consumer-prod-old',
          services: [{ service_name: 'service-name1' }],
        },
      ],
    });
    axios.create.mockReturnValueOnce({ get: mockGet, post: vi.fn() });

    await syncPscConnections('prod-key', iamWithServices, true);

    expect(axios.post).not.toHaveBeenCalled();
    // consumer-prod-1234 is already connected → no change
    // consumer-prod-old is connected but not in IAM → would be removed
    // service-name2 has no consumers → no entry
    expect(core.info).toHaveBeenCalledWith(expect.stringContaining('dry-run'));
    expect(core.info).not.toHaveBeenCalledWith(expect.stringContaining('Would connect: consumer-prod-1234 → service-name1'));
    expect(core.info).toHaveBeenCalledWith('  Would disconnect: consumer-prod-old → service-name1');
  });

  test('dry-run reports no changes when current state matches IAM', async () => {
    setupGcloud.mockResolvedValueOnce('producer-prod-1234');
    getIdToken.mockResolvedValueOnce('id-token');

    const mockGet = vi.fn().mockResolvedValueOnce({
      data: [
        {
          consumer_projectid: 'consumer-prod-1234',
          services: [{ service_name: 'service-name1' }],
        },
      ],
    });
    axios.create.mockReturnValueOnce({ get: mockGet, post: vi.fn() });

    await syncPscConnections('prod-key', iamWithServices, true);

    expect(core.info).toHaveBeenCalledWith('  No PSC changes.');
  });
});
