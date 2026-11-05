import nock from 'nock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
});
