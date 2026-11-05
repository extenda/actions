import * as core from '@actions/core';
import { afterEach, describe, expect, test, vi } from 'vitest';

import ensureSingleActiveRevision from '../../src/cloudrun/active-revision.js';
import getRevisions from '../../src/cloudrun/get-revisions.js';
import { getPreviousRevision } from '../../src/utils/canary-revisions.js';
import {
  getAutomaticCanary,
  setRevisionTraffic,
} from '../../src/utils/send-request.js';

vi.mock('@actions/core');
vi.mock('../../src/cloudrun/get-revisions.js');
vi.mock('../../src/utils/canary-revisions.js');
vi.mock('../../src/utils/send-request.js');

const SERVICE = 'my-service';
const PROJECT = 'my-project';
const REGION = 'europe-west1';
const SERVING = 'my-service-00001-xyz';
const IDLE = 'my-service-00002-abc';
const MULTIPLE_ACTIVE =
  '2 active revisions found, set revision to 100% traffic before deploying';
// The message when no repair was tried: exactly the text, with no cause.
const multipleActiveOnly = new Error(MULTIPLE_ACTIVE);

const revision = (name, active, creationTimestamp) => ({
  name,
  active,
  creationTimestamp,
});

const oneActive = [
  revision(IDLE, false, '2000-01-20T12:00:00Z'),
  revision(SERVING, true, '2000-01-16T12:00:00Z'),
];

const twoActive = [
  revision(IDLE, true, '2000-01-20T12:00:00Z'),
  revision(SERVING, true, '2000-01-16T12:00:00Z'),
  revision('my-service-00000-old', false, '2000-01-10T12:00:00Z'),
];

const canary = (status, stepIndex = -1) => ({
  id: 7,
  service: SERVICE,
  project_id: PROJECT,
  region: REGION,
  revision: IDLE,
  previous_revision: SERVING,
  steps: '[10,50,100]',
  step_index: stepIndex,
  status,
});

const activeRevision = (automaticCanary) =>
  ensureSingleActiveRevision(SERVICE, PROJECT, REGION, automaticCanary);

describe('ensureSingleActiveRevision', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  test('It returns the one active revision when the service has no canary', async () => {
    getRevisions.mockResolvedValueOnce(oneActive);
    getAutomaticCanary.mockResolvedValueOnce(null);

    await expect(activeRevision(true)).resolves.toEqual(SERVING);

    expect(getRevisions).toHaveBeenCalledWith(SERVICE, PROJECT, REGION);
    expect(getAutomaticCanary).toHaveBeenCalledWith(SERVICE, PROJECT, REGION);
    expect(setRevisionTraffic).not.toHaveBeenCalled();
  });

  test('It reads the canary before it lists the revisions', async () => {
    getRevisions.mockResolvedValueOnce(oneActive);
    getAutomaticCanary.mockResolvedValueOnce(null);

    await activeRevision(true);

    expect(getAutomaticCanary.mock.invocationCallOrder[0]).toBeLessThan(
      getRevisions.mock.invocationCallOrder[0],
    );
  });

  test.each(['completed', 'rolled_back', 'failed', 'cancelled'])(
    'It returns the one active revision when the canary is %s',
    async (status) => {
      getRevisions.mockResolvedValueOnce(oneActive);
      getAutomaticCanary.mockResolvedValueOnce(canary(status, 2));

      await expect(activeRevision(true)).resolves.toEqual(SERVING);
      expect(setRevisionTraffic).not.toHaveBeenCalled();
    },
  );

  test('It returns an empty name when no revision is active', async () => {
    getRevisions.mockResolvedValueOnce([]);
    getAutomaticCanary.mockResolvedValueOnce(null);

    await expect(activeRevision(true)).resolves.toEqual('');
    expect(setRevisionTraffic).not.toHaveBeenCalled();
  });

  test('It fails while a canary waits for its first step', async () => {
    getAutomaticCanary.mockResolvedValueOnce(canary('in_progress'));

    const error = await activeRevision(true).catch((err) => err);

    expect(error.message).toContain(`revision ${IDLE}`);
    expect(error.message).toContain('waiting for its first step');
    expect(error.message).toContain('POST /services/revisions');
    expect(error.message).toContain('cancels the canary');
    expect(getRevisions).not.toHaveBeenCalled();
    expect(setRevisionTraffic).not.toHaveBeenCalled();
  });

  test('It fails and names the step while a canary shifts traffic', async () => {
    getAutomaticCanary.mockResolvedValueOnce(canary('in_progress', 1));

    await expect(activeRevision(true)).rejects.toThrow(
      `A canary is in progress for revision ${IDLE}, at step 2 of 3 (50% traffic).`,
    );
    expect(getRevisions).not.toHaveBeenCalled();
    expect(getPreviousRevision).not.toHaveBeenCalled();
    expect(setRevisionTraffic).not.toHaveBeenCalled();
  });

  test('It fails on a canary in progress for a service without automatic canary', async () => {
    getAutomaticCanary.mockResolvedValueOnce(canary('in_progress', 0));

    await expect(activeRevision(false)).rejects.toThrow(
      `A canary is in progress for revision ${IDLE}, at step 1 of 3 (10% traffic).`,
    );
  });

  test('It names the step by number when the steps cannot be read', async () => {
    getAutomaticCanary.mockResolvedValueOnce({
      ...canary('in_progress', 1),
      steps: 'not json',
    });

    await expect(activeRevision(true)).rejects.toThrow(
      `A canary is in progress for revision ${IDLE}, at step 2.`,
    );
  });

  test('It gives all traffic to the serving revision when the other one is idle without a canary', async () => {
    getRevisions.mockResolvedValueOnce(twoActive);
    getAutomaticCanary.mockResolvedValueOnce(null);
    getPreviousRevision.mockResolvedValueOnce(SERVING);
    setRevisionTraffic.mockResolvedValueOnce();

    await expect(activeRevision(true)).resolves.toEqual(SERVING);

    expect(getPreviousRevision).toHaveBeenCalledWith(SERVICE, PROJECT, REGION);
    expect(setRevisionTraffic).toHaveBeenCalledTimes(1);
    expect(setRevisionTraffic).toHaveBeenCalledWith(SERVICE, PROJECT, REGION, [
      { name: SERVING, trafficPercent: 100 },
    ]);
    // A change of the service traffic is shown on the run page.
    expect(core.notice).toHaveBeenCalledWith(expect.stringContaining(SERVING));
  });

  test('It repairs an idle revision whose canary has ended', async () => {
    getRevisions.mockResolvedValueOnce(twoActive);
    getAutomaticCanary.mockResolvedValueOnce(canary('cancelled', 0));
    getPreviousRevision.mockResolvedValueOnce(SERVING);
    setRevisionTraffic.mockResolvedValueOnce();

    await expect(activeRevision(true)).resolves.toEqual(SERVING);
    expect(setRevisionTraffic).toHaveBeenCalledWith(SERVICE, PROJECT, REGION, [
      { name: SERVING, trafficPercent: 100 },
    ]);
  });

  test('It fails with the cause when the repair is refused', async () => {
    getRevisions.mockResolvedValueOnce(twoActive);
    getAutomaticCanary.mockResolvedValueOnce(null);
    getPreviousRevision.mockResolvedValueOnce(SERVING);
    setRevisionTraffic.mockRejectedValueOnce(
      new Error('Request failed with status code 500'),
    );

    await expect(activeRevision(true)).rejects.toThrow(
      `${MULTIPLE_ACTIVE}. Unable to set 100% traffic to ${SERVING}: Request failed with status code 500`,
    );
  });

  test('It fails with the cause when the traffic cannot be read', async () => {
    getRevisions.mockResolvedValueOnce(twoActive);
    getAutomaticCanary.mockResolvedValueOnce(null);
    getPreviousRevision.mockRejectedValueOnce(new Error('gcloud failed'));

    await expect(activeRevision(true)).rejects.toThrow(
      `${MULTIPLE_ACTIVE}. Unable to read the traffic of the service: gcloud failed`,
    );
    expect(setRevisionTraffic).not.toHaveBeenCalled();
  });

  test('It fails on a traffic split without a canary', async () => {
    getRevisions.mockResolvedValueOnce(twoActive);
    getAutomaticCanary.mockResolvedValueOnce(null);
    // No revision serves 100% of the traffic.
    getPreviousRevision.mockResolvedValueOnce(null);

    await expect(activeRevision(true)).rejects.toThrow(multipleActiveOnly);
    expect(setRevisionTraffic).not.toHaveBeenCalled();
  });

  test('It fails when the serving revision is not one of the active revisions', async () => {
    getRevisions.mockResolvedValueOnce(twoActive);
    getAutomaticCanary.mockResolvedValueOnce(null);
    getPreviousRevision.mockResolvedValueOnce('my-service-00000-old');

    await expect(activeRevision(true)).rejects.toThrow(multipleActiveOnly);
    expect(setRevisionTraffic).not.toHaveBeenCalled();
  });

  test('It fails on more than two active revisions', async () => {
    getRevisions.mockResolvedValueOnce([
      ...twoActive,
      revision('my-service-00003-new', true, '2000-01-22T12:00:00Z'),
    ]);
    getAutomaticCanary.mockResolvedValueOnce(null);

    await expect(activeRevision(true)).rejects.toThrow(multipleActiveOnly);
    expect(getPreviousRevision).not.toHaveBeenCalled();
    expect(setRevisionTraffic).not.toHaveBeenCalled();
  });

  test('It does not repair a service without automatic canary', async () => {
    getRevisions.mockResolvedValueOnce(twoActive);
    getAutomaticCanary.mockResolvedValueOnce(null);

    await expect(activeRevision(false)).rejects.toThrow(multipleActiveOnly);
    expect(getPreviousRevision).not.toHaveBeenCalled();
    expect(setRevisionTraffic).not.toHaveBeenCalled();
  });

  describe('platform-api gives no answer', () => {
    test('It returns the one active revision and warns', async () => {
      getRevisions.mockResolvedValueOnce(oneActive);
      getAutomaticCanary.mockRejectedValueOnce(
        new Error('timeout of 10000ms exceeded'),
      );

      await expect(activeRevision(true)).resolves.toEqual(SERVING);
      expect(core.warning).toHaveBeenCalledWith(
        expect.stringContaining('timeout of 10000ms exceeded'),
      );
    });

    test('It does not repair two active revisions', async () => {
      getRevisions.mockResolvedValueOnce(twoActive);
      getAutomaticCanary.mockRejectedValueOnce(
        new Error('Request failed with status code 503'),
      );

      await expect(activeRevision(true)).rejects.toThrow(multipleActiveOnly);
      expect(getPreviousRevision).not.toHaveBeenCalled();
      expect(setRevisionTraffic).not.toHaveBeenCalled();
    });
  });
});
