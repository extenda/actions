import * as core from '@actions/core';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import nock from 'nock';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import getToken from '../../src/utils/identity-token.js';
import {
  getAutomaticCanary,
  setRevisionTraffic,
} from '../../src/utils/send-request.js';

vi.mock('@actions/core');
vi.mock('../../src/utils/identity-token.js');

const PLATFORM_API = 'https://platform-api.retailsvc.com';

const canary = {
  id: 7,
  service: 'my-service',
  project_id: 'my-project',
  region: 'europe-west1',
  revision: 'my-service-00002-abc',
  previous_revision: 'my-service-00001-xyz',
  steps: '[10,50,100]',
  step_index: 0,
  status: 'in_progress',
};

describe('platform-api requests on the wire', () => {
  beforeEach(() => {
    nock.disableNetConnect();
    getToken.mockResolvedValue('token');
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
    vi.clearAllMocks();
  });

  describe('getAutomaticCanary', () => {
    const canaryRequest = () =>
      nock(PLATFORM_API, { reqheaders: { authorization: 'Bearer token' } })
        .get('/canary/automatic/my-service')
        .query({ project: 'my-project', region: 'europe-west1' });

    it('returns the canary record', async () => {
      canaryRequest().reply(200, canary);

      await expect(
        getAutomaticCanary('my-service', 'my-project', 'europe-west1'),
      ).resolves.toEqual(canary);
    });

    it('returns null when the service has no canary', async () => {
      canaryRequest().reply(404, {
        statusCode: 404,
        message: 'No canary found for this service',
      });

      await expect(
        getAutomaticCanary('my-service', 'my-project', 'europe-west1'),
      ).resolves.toBeNull();
    });

    it.each([
      ['an empty body', undefined],
      ['a page from something else', '<html><body>Not Found</body></html>'],
      ['another JSON body', { error: 'not found' }],
    ])('throws on a 404 with %s', async (_name, body) => {
      canaryRequest().reply(404, body);

      await expect(
        getAutomaticCanary('my-service', 'my-project', 'europe-west1'),
      ).rejects.toThrow('Unexpected answer from platform-api (status 404)');
    });

    it.each([
      ['an empty body', undefined],
      ['a page from something else', '<html><body>OK</body></html>'],
      ['an empty object', {}],
      ['a record without a revision', { status: 'in_progress' }],
      ['a record without a status', { revision: 'my-service-00002-abc' }],
    ])('throws on a 200 with %s', async (_name, body) => {
      canaryRequest().reply(200, body);

      await expect(
        getAutomaticCanary('my-service', 'my-project', 'europe-west1'),
      ).rejects.toThrow('Unexpected answer from platform-api (status 200)');
    });

    it.each([400, 403, 500, 503])(
      'throws when platform-api answers %i',
      async (status) => {
        canaryRequest().reply(status, { statusCode: status });

        await expect(
          getAutomaticCanary('my-service', 'my-project', 'europe-west1'),
        ).rejects.toThrow(`${status}`);
      },
    );

    it('throws when platform-api cannot be reached', async () => {
      canaryRequest().replyWithError(
        Object.assign(new Error('connect ECONNREFUSED'), {
          code: 'ECONNREFUSED',
        }),
      );

      await expect(
        getAutomaticCanary('my-service', 'my-project', 'europe-west1'),
      ).rejects.toThrow('ECONNREFUSED');
    });

    it('encodes the service name in the path', async () => {
      const scope = nock(PLATFORM_API)
        .get('/canary/automatic/my%2Fservice')
        .query(true)
        .reply(404, { statusCode: 404, message: 'No canary found' });

      await getAutomaticCanary('my/service', 'my-project', 'europe-west1');

      expect(scope.isDone()).toBe(true);
    });
  });

  describe('setRevisionTraffic', () => {
    const revisions = [{ name: 'my-service-00001-xyz', trafficPercent: 100 }];

    it('posts the revisions as the body and the service as the query', async () => {
      let body;
      const scope = nock(PLATFORM_API, {
        reqheaders: {
          authorization: 'Bearer token',
          'content-type': 'application/json',
        },
      })
        .post('/services/revisions', (requestBody) => {
          body = requestBody;
          return true;
        })
        .query({
          project: 'my-project',
          service: 'my-service',
          region: 'europe-west1',
        })
        .reply(200, { data: [] });

      await setRevisionTraffic(
        'my-service',
        'my-project',
        'europe-west1',
        revisions,
      );

      expect(scope.isDone()).toBe(true);
      expect(body).toEqual(revisions);
    });

    it('throws when platform-api refuses the change', async () => {
      nock(PLATFORM_API)
        .post('/services/revisions')
        .query(true)
        .reply(400, { statusCode: 400, message: 'Body is not valid' });

      await expect(
        setRevisionTraffic(
          'my-service',
          'my-project',
          'europe-west1',
          revisions,
        ),
      ).rejects.toThrow('Request failed with status code 400');
    });
  });

  // In the built action, publish-policies.js installs this retry setup on the
  // shared axios instance, so it applies to every request.
  describe('with the retry setup of the built action', () => {
    let interceptors;

    beforeAll(() => {
      interceptors = axiosRetry(axios, {
        retries: 4,
        retryDelay: (retryCount) => {
          core.info(
            `Request to das sync worker failed.. retrying(${retryCount})`,
          );
          return retryCount * 500;
        },
      });
    });

    afterAll(() => {
      axios.interceptors.request.eject(interceptors.requestInterceptorId);
      axios.interceptors.response.eject(interceptors.responseInterceptorId);
    });

    const countRequests = (scope) => {
      const seen = { requests: 0 };
      scope.on('request', () => {
        seen.requests += 1;
      });
      return seen;
    };

    // Answers the canary status with each status in turn, then repeats the last.
    const canaryStatusAnswers = (...statuses) => {
      let answered = 0;
      return countRequests(
        nock(PLATFORM_API)
          .persist()
          .get('/canary/automatic/my-service')
          .query(true)
          .reply(() => {
            const status = statuses[Math.min(answered, statuses.length - 1)];
            answered += 1;
            return [status, status === 200 ? canary : { statusCode: status }];
          }),
      );
    };

    // The retries wait in real time.
    const slow = { timeout: 10000 };

    const infoLines = () => core.info.mock.calls.map(([line]) => line);

    it(
      'reads the canary status three times on a 503 and names the call in the log',
      slow,
      async () => {
        const seen = canaryStatusAnswers(503);

        await expect(
          getAutomaticCanary('my-service', 'my-project', 'europe-west1'),
        ).rejects.toThrow('Request failed with status code 503');

        expect(seen.requests).toBe(3);
        expect(infoLines()).toEqual([
          'Request to platform-api for the canary status failed, retrying (1)',
          'Request to platform-api for the canary status failed, retrying (2)',
        ]);
      },
    );

    it('returns the canary record when a retry succeeds', slow, async () => {
      const seen = canaryStatusAnswers(503, 503, 200);

      await expect(
        getAutomaticCanary('my-service', 'my-project', 'europe-west1'),
      ).resolves.toEqual(canary);

      expect(seen.requests).toBe(3);
    });

    it(
      'reads the canary status three times when the connection drops',
      slow,
      async () => {
        const seen = countRequests(
          nock(PLATFORM_API)
            .persist()
            .get('/canary/automatic/my-service')
            .query(true)
            .replyWithError(
              Object.assign(new Error('socket hang up'), {
                code: 'ECONNRESET',
              }),
            ),
        );

        await expect(
          getAutomaticCanary('my-service', 'my-project', 'europe-west1'),
        ).rejects.toThrow('socket hang up');

        expect(seen.requests).toBe(3);
        expect(infoLines().join('\n')).not.toContain('das sync worker');
      },
    );

    it('reads the canary status once on a 404', async () => {
      const seen = canaryStatusAnswers(404);

      await expect(
        getAutomaticCanary('my-service', 'my-project', 'europe-west1'),
      ).resolves.toBeNull();

      expect(seen.requests).toBe(1);
      expect(infoLines()).toEqual([]);
    });

    it('reads the canary status once on a 403', async () => {
      const seen = canaryStatusAnswers(403);

      await expect(
        getAutomaticCanary('my-service', 'my-project', 'europe-west1'),
      ).rejects.toThrow('Request failed with status code 403');

      expect(seen.requests).toBe(1);
      expect(infoLines()).toEqual([]);
    });

    it('sets the traffic once on a 500', async () => {
      const seen = countRequests(
        nock(PLATFORM_API)
          .persist()
          .post('/services/revisions')
          .query(true)
          .reply(500, { statusCode: 500 }),
      );

      await expect(
        setRevisionTraffic('my-service', 'my-project', 'europe-west1', [
          { name: 'my-service-00001-xyz', trafficPercent: 100 },
        ]),
      ).rejects.toThrow('Request failed with status code 500');

      expect(seen.requests).toBe(1);
      expect(infoLines()).toEqual([]);
    });
  });
});
