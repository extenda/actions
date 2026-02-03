jest.mock('@actions/exec');
jest.mock('../src/dns-record.js');
jest.mock('../src/alert-certificate-expiration.js');

import * as exec from '@actions/exec';

import configureDomains from '../src/configure-domains.js';
import { addDnsRecord } from '../src/dns-record.js';
import { mockOutput } from './utils.js';

const mockCluster = {
  project: 'test-project-staging-1234',
  cluster: 'k8s-cluster',
  clusterLocation: 'europe-west1',
};

describe('Configure domains', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('It configures only new domains', async () => {
    exec.exec
      .mockImplementationOnce((bin, args, opts) =>
        mockOutput(
          `other-service.retailsvc.dev  other-service
existing.retailsvc.dev  test-service
`,
          opts,
        ),
      )
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockImplementationOnce((bin, args, opts) =>
        mockOutput('test-service.retailsvc.dev 10.10.10.1', opts),
      );

    const newDomains = await configureDomains(
      {
        name: 'test-service',
        platform: {
          gke: {
            connectivity: 'external',
            'domain-mappings': {
              prod: ['test-service.retailsvc.com'],
              staging: ['test-service.retailsvc.dev', 'existing.retailsvc.dev'],
            },
          },
        },
      },
      mockCluster,
      '',
      'dns-project',
    );

    expect(newDomains).toEqual(['test-service.retailsvc.dev']);
    expect(exec.exec.mock.calls[2][1]).toEqual([
      'run',
      'domain-mappings',
      'create',
      '--service=test-service',
      '--domain=test-service.retailsvc.dev',
      '--namespace=test-service',
      '--platform=gke',
      '--project=test-project-staging-1234',
      '--cluster=k8s-cluster',
      '--cluster-location=europe-west1',
      '--format=value(CONTENTS)',
    ]);
    expect(addDnsRecord).toHaveBeenCalled();
  });

  test('It throws exception if domain mapping conflicts', async () => {
    exec.exec.mockImplementationOnce((bin, args, opts) =>
      mockOutput(
        `other-service.retailsvc.dev  other-service
conflict.retailsvc.dev  other-service
`,
        opts,
      ),
    );

    const service = {
      name: 'test-service',
      platform: {
        gke: {
          connectivity: 'external',
          'domain-mappings': {
            prod: ['test-service.retailsvc.com'],
            staging: ['test-service.retailsvc.dev', 'conflict.retailsvc.dev'],
          },
        },
      },
    };

    await expect(
      configureDomains(service, mockCluster, '', 'dns-project'),
    ).rejects.toEqual(
      new Error(
        'Conflict: Domain conflict.retailsvc.dev already mapped to service other-service',
      ),
    );
  });

  test('It skips domains if not configured', async () => {
    const service = {
      name: 'test-service',
      platform: {
        gke: {
          connectivity: 'external',
        },
      },
    };

    const domains = await configureDomains(
      service,
      mockCluster,
      '',
      'dns-project',
    );
    expect(domains).toEqual([]);
  });

  test('It skips domains for managed Cloud Run', async () => {
    const service = {
      name: 'test-service',
      platform: {
        managed: {},
      },
    };

    const domains = await configureDomains(
      service,
      undefined,
      'prod',
      'dns-project',
    );
    expect(domains).toEqual([]);
  });

  test('It skips domains for internal connectivity', async () => {
    const service = {
      name: 'test-service',
      platform: {
        managed: {
          connectivity: 'internal',
        },
      },
    };

    const domains = await configureDomains(
      service,
      undefined,
      'prod',
      'dns-project',
    );
    expect(domains).toEqual([]);
  });

  test('It adds test domains for prod', async () => {
    exec.exec
      .mockImplementationOnce((bin, args, opts) => mockOutput('', opts))
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockImplementationOnce((bin, args, opts) =>
        mockOutput('* 10.10.10.1', opts),
      );

    const service = {
      name: 'test-service',
      platform: {
        gke: {
          connectivity: 'external',
          'domain-mappings': {
            prod: ['test-service.retailsvc.com'],
            staging: ['test-service.retailsvc.dev'],
          },
        },
      },
    };

    const domains = await configureDomains(
      service,
      mockCluster,
      'prod',
      'dns-project',
    );
    expect(domains).toEqual([
      'test-service.retailsvc.com',
      'test-service.retailsvc-test.com',
    ]);
  });
});
