import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getNewRevision,
  getPreviousRevision,
} from '../../src/utils/canary-revisions.js';
import gcloudOutput from '../../src/utils/gcloud-output.js';

vi.mock('../../src/utils/gcloud-output.js');

describe('canary-revisions', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getPreviousRevision', () => {
    it('returns the revision name that has 100% traffic', async () => {
      gcloudOutput.mockResolvedValue(
        JSON.stringify([
          {
            metadata: { name: 'my-service' },
            status: {
              traffic: [
                { revisionName: 'my-service-00001-abc', percent: 100 },
                { revisionName: 'my-service-00002-xyz', percent: 0 },
              ],
            },
          },
        ]),
      );

      const result = await getPreviousRevision('my-service', 'my-project');

      expect(result).toEqual({
        firstDeploy: false,
        revision: 'my-service-00001-abc',
      });
      expect(gcloudOutput).toHaveBeenCalledWith(
        [
          'run',
          'services',
          'list',
          '--project=my-project',
          '--region=europe-west1',
          '--filter=metadata.name~^my-service$',
          '--format=json(metadata.name,status.traffic)',
        ],
        'gcloud',
        true,
        true,
      );
    });

    it('is not a first deploy when traffic is split', async () => {
      gcloudOutput.mockResolvedValue(
        JSON.stringify([
          {
            metadata: { name: 'my-service' },
            status: {
              traffic: [
                { revisionName: 'my-service-00001-abc', percent: 90 },
                { revisionName: 'my-service-00002-xyz', percent: 10 },
              ],
            },
          },
        ]),
      );

      expect(await getPreviousRevision('my-service', 'my-project')).toEqual({
        firstDeploy: false,
        revision: null,
      });
    });

    it('is a first deploy when the service does not exist', async () => {
      gcloudOutput.mockResolvedValue('[]');

      expect(await getPreviousRevision('my-service', 'my-project')).toEqual({
        firstDeploy: true,
        revision: null,
      });
    });

    it('does not match a service with a longer name', async () => {
      gcloudOutput.mockResolvedValue(
        JSON.stringify([
          {
            metadata: { name: 'my-service-worker' },
            status: {
              traffic: [{ revisionName: 'worker-00001', percent: 100 }],
            },
          },
        ]),
      );

      expect(await getPreviousRevision('my-service', 'my-project')).toEqual({
        firstDeploy: true,
        revision: null,
      });
    });

    it('is a first deploy when the service has no traffic status', async () => {
      gcloudOutput.mockResolvedValue(
        JSON.stringify([{ metadata: { name: 'my-service' }, status: {} }]),
      );

      expect(await getPreviousRevision('my-service', 'my-project')).toEqual({
        firstDeploy: true,
        revision: null,
      });
    });

    it('throws when the output is empty', async () => {
      gcloudOutput.mockResolvedValue('');

      await expect(
        getPreviousRevision('my-service', 'my-project'),
      ).rejects.toThrow('empty output');
    });

    it('throws when gcloud fails', async () => {
      gcloudOutput.mockRejectedValue(new Error('gcloud failed'));

      await expect(
        getPreviousRevision('my-service', 'my-project'),
      ).rejects.toThrow(
        'Failed to look up service my-service in project my-project, region europe-west1: gcloud failed',
      );
    });

    it('accepts a custom region', async () => {
      gcloudOutput.mockResolvedValue(
        JSON.stringify([
          {
            metadata: { name: 'my-service' },
            status: {
              traffic: [{ revisionName: 'my-service-00001-abc', percent: 100 }],
            },
          },
        ]),
      );

      await getPreviousRevision('my-service', 'my-project', 'us-central1');

      expect(gcloudOutput).toHaveBeenCalledWith(
        expect.arrayContaining(['--region=us-central1']),
        'gcloud',
        true,
        true,
      );
    });
  });

  describe('getNewRevision', () => {
    it('returns the latest revision name', async () => {
      gcloudOutput.mockResolvedValue('my-service-00003-new');

      const result = await getNewRevision('my-service', 'my-project');

      expect(result).toBe('my-service-00003-new');
      expect(gcloudOutput).toHaveBeenCalledWith([
        'run',
        'revisions',
        'list',
        '--service=my-service',
        '--project=my-project',
        '--region=europe-west1',
        '--sort-by=~creationTimestamp',
        '--limit=1',
        '--format=value(metadata.name)',
      ]);
    });

    it('accepts a custom region', async () => {
      gcloudOutput.mockResolvedValue('my-service-00003-new');

      await getNewRevision('my-service', 'my-project', 'us-central1');

      expect(gcloudOutput).toHaveBeenCalledWith(
        expect.arrayContaining(['--region=us-central1']),
      );
    });
  });
});
