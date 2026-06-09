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
        JSON.stringify({
          status: {
            traffic: [
              { revisionName: 'my-service-00001-abc', percent: 100 },
              { revisionName: 'my-service-00002-xyz', percent: 0 },
            ],
          },
        }),
      );

      const result = await getPreviousRevision('my-service', 'my-project');

      expect(result).toBe('my-service-00001-abc');
      expect(gcloudOutput).toHaveBeenCalledWith([
        'run',
        'services',
        'describe',
        'my-service',
        '--project=my-project',
        '--region=europe-west1',
        '--format=json(status.traffic)',
      ]);
    });

    it('returns null when no revision has 100% traffic', async () => {
      gcloudOutput.mockResolvedValue(
        JSON.stringify({
          status: {
            traffic: [
              { revisionName: 'my-service-00001-abc', percent: 90 },
              { revisionName: 'my-service-00002-xyz', percent: 10 },
            ],
          },
        }),
      );

      const result = await getPreviousRevision('my-service', 'my-project');

      expect(result).toBeNull();
    });

    it('accepts a custom region', async () => {
      gcloudOutput.mockResolvedValue(
        JSON.stringify({
          status: {
            traffic: [{ revisionName: 'my-service-00001-abc', percent: 100 }],
          },
        }),
      );

      await getPreviousRevision('my-service', 'my-project', 'us-central1');

      expect(gcloudOutput).toHaveBeenCalledWith(
        expect.arrayContaining(['--region=us-central1']),
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
