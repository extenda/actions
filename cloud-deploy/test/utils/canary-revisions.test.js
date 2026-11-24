import { afterEach, describe, expect, it, vi } from 'vitest';

import getRevisions from '../../src/cloudrun/get-revisions.js';
import {
  deleteRevision,
  getNewRevision,
  getPreviousRevision,
  getTrafficSplit,
  shiftTrafficToRevision,
  waitForFullTraffic,
} from '../../src/utils/canary-revisions.js';
import gcloudOutput from '../../src/utils/gcloud-output.js';
import { retryUntil } from '../../src/utils/retry-until.js';

vi.mock('../../src/utils/gcloud-output.js');
vi.mock('../../src/cloudrun/get-revisions.js');
vi.mock('../../src/utils/retry-until.js');

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

  describe('getTrafficSplit', () => {
    it('returns revisions with their traffic percent', async () => {
      gcloudOutput.mockResolvedValue(
        JSON.stringify([
          {
            metadata: { name: 'my-service' },
            status: {
              traffic: [
                { revisionName: 'r1', percent: 90 },
                { revisionName: 'r2', percent: 10 },
                { latestRevision: true },
              ],
            },
          },
        ]),
      );
      expect(await getTrafficSplit('my-service', 'p')).toEqual([
        { revisionName: 'r1', percent: 90 },
        { revisionName: 'r2', percent: 10 },
      ]);
    });

    it('fails closed on traffic without a revision name (latestRevision)', async () => {
      gcloudOutput.mockResolvedValue(
        JSON.stringify([
          {
            metadata: { name: 'my-service' },
            status: {
              traffic: [
                { revisionName: 'r1', percent: 50 },
                { latestRevision: true, percent: 50 },
              ],
            },
          },
        ]),
      );
      await expect(getTrafficSplit('my-service', 'p')).rejects.toThrow(
        'target without a revision name',
      );
    });

    it('ignores nameless entries without traffic', async () => {
      gcloudOutput.mockResolvedValue(
        JSON.stringify([
          {
            metadata: { name: 'my-service' },
            status: {
              traffic: [
                { revisionName: 'r1', percent: 100 },
                { latestRevision: true, percent: 0 },
              ],
            },
          },
        ]),
      );
      expect(await getTrafficSplit('my-service', 'p')).toEqual([
        { revisionName: 'r1', percent: 100 },
      ]);
    });

    it('returns an empty list for empty output and wraps gcloud errors', async () => {
      gcloudOutput.mockResolvedValueOnce('');
      expect(await getTrafficSplit('my-service', 'p')).toEqual([]);
      gcloudOutput.mockRejectedValueOnce(new Error('boom'));
      await expect(getTrafficSplit('my-service', 'p')).rejects.toThrow(
        'Failed to read traffic for service my-service in project p, region europe-west1: boom',
      );
    });
  });

  describe('shiftTrafficToRevision', () => {
    it('routes 100% traffic to the revision', async () => {
      gcloudOutput.mockResolvedValue('');
      await shiftTrafficToRevision('svc', 'p', 'r', 'svc-1');
      expect(gcloudOutput).toHaveBeenCalledWith(
        [
          'run',
          'services',
          'update-traffic',
          'svc',
          '--project=p',
          '--region=r',
          '--to-revisions=svc-1=100',
        ],
        'gcloud',
        true,
        true,
      );
    });

    it('wraps update-traffic failures', async () => {
      gcloudOutput.mockRejectedValue(new Error('denied'));
      await expect(
        shiftTrafficToRevision('svc', 'p', 'r', 'svc-1'),
      ).rejects.toThrow('Failed to route 100% traffic to svc-1');
    });
  });

  describe('waitForFullTraffic', () => {
    it('polls traffic until the revision has 100%', async () => {
      retryUntil.mockImplementation(async (queryFn, checkFn) => {
        gcloudOutput.mockResolvedValue(
          JSON.stringify([
            {
              metadata: { name: 'svc' },
              status: { traffic: [{ revisionName: 'svc-1', percent: 100 }] },
            },
          ]),
        );
        const out = await queryFn();
        expect(checkFn(out)).toBe(true);
        expect(checkFn([{ revisionName: 'svc-1', percent: 90 }])).toBe(false);
        expect(checkFn([{ revisionName: 'svc-2', percent: 100 }])).toBe(false);
        return out;
      });
      await waitForFullTraffic('svc', 'p', 'r', 'svc-1', 1000);
      expect(retryUntil).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        1000,
      );
    });

    it('fails with a clear error on timeout', async () => {
      retryUntil.mockRejectedValue(
        new Error('Timed out waiting for condition'),
      );
      await expect(
        waitForFullTraffic('svc', 'p', 'r', 'svc-1'),
      ).rejects.toThrow(
        'Revision svc-1 did not reach 100% traffic for service svc: Timed out',
      );
    });
  });

  describe('deleteRevision', () => {
    it('deletes with --quiet and waits until the revision is gone', async () => {
      gcloudOutput.mockResolvedValue('');
      getRevisions.mockResolvedValueOnce([{ name: 'svc-2' }]);
      retryUntil.mockImplementation(async (queryFn, checkFn) => {
        expect(checkFn([{ name: 'svc-1' }])).toBe(true);
        expect(checkFn([{ name: 'svc-2' }])).toBe(false);
        return [];
      });
      await deleteRevision('svc', 'p', 'r', 'svc-2');
      expect(gcloudOutput).toHaveBeenCalledWith(
        [
          'run',
          'revisions',
          'delete',
          'svc-2',
          '--project=p',
          '--region=r',
          '--quiet',
        ],
        'gcloud',
        true,
        true,
      );
    });

    it('succeeds without deleting when the revision is already gone', async () => {
      getRevisions.mockResolvedValue([{ name: 'svc-1' }]);
      await deleteRevision('svc', 'p', 'r', 'svc-2');
      expect(gcloudOutput).not.toHaveBeenCalled();
    });

    it('counts a failed delete as success when the revision is gone afterwards', async () => {
      getRevisions
        .mockResolvedValueOnce([{ name: 'svc-2' }])
        .mockResolvedValueOnce([]);
      gcloudOutput.mockRejectedValue(new Error('not found'));
      await deleteRevision('svc', 'p', 'r', 'svc-2');
      expect(retryUntil).not.toHaveBeenCalled();
    });

    it('wraps delete failures when the revision is still there', async () => {
      getRevisions.mockResolvedValue([{ name: 'svc-2' }]);
      gcloudOutput.mockRejectedValue(new Error('nope'));
      await expect(deleteRevision('svc', 'p', 'r', 'svc-2')).rejects.toThrow(
        'Failed to delete canary revision svc-2 of service svc: nope',
      );
      expect(retryUntil).not.toHaveBeenCalled();
    });
  });
});
