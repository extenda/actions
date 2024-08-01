const exec = require('@actions/exec');
const core = require('@actions/core');
const configureDomains = require('../src/configure-domains');
const handleCertificates = require('../src/handle-certificate');

jest.mock('@actions/exec');
jest.mock('../src/handle-certificate');
jest.mock('../../cloud-run/src/dns-record');
jest.mock('@actions/core');

const DNSListJSON = [
  {
    kind: 'dns#resourceRecordSet',
    name: 'testrunner-se.txengine.retailsvc.dev.',
    rrdatas: ['199.199.199.199'],
    ttl: 300,
    type: 'A',
  },
  {
    kind: 'dns#resourceRecordSet',
    name: 'testrunner-dk.txengine.retailsvc.dev.',
    rrdatas: ['199.199.199.198'],
    ttl: 300,
    type: 'A',
  },
];

const DNSListJSONProd = [
  {
    kind: 'dns#resourceRecordSet',
    name: 'testrunner-se.txengine.retailsvc.com.',
    rrdatas: ['199.199.199.199'],
    ttl: 300,
    type: 'A',
  },
  {
    kind: 'dns#resourceRecordSet',
    name: 'testrunner-dk.txengine.retailsvc.com.',
    rrdatas: ['199.199.199.198'],
    ttl: 300,
    type: 'A',
  },
];

describe('configure domains', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('It can configure dns for tenant', async () => {
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockImplementationOnce((cmd, args, opts) =>
      opts.listeners.stdout(JSON.stringify(DNSListJSON)),
    );
    exec.exec.mockResolvedValue(0);

    await configureDomains('staging', 'testrunner', 'se');
    expect(exec.exec).toHaveBeenCalledTimes(18);
  });

  test('It can obtain ip if ip is not created', async () => {
    exec.exec.mockRejectedValueOnce(0);
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockResolvedValueOnce('199.199.199.198');
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockImplementationOnce((cmd, args, opts) =>
      opts.listeners.stdout(JSON.stringify(DNSListJSONProd)),
    );
    exec.exec.mockResolvedValue(0);

    await configureDomains('prod', 'testrunner', 'se');
    expect(exec.exec).toHaveBeenCalledTimes(20);
  });

  test('It can create dns if it doesnt exists', async () => {
    exec.exec.mockResolvedValueOnce('199.199.199.199');
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockImplementationOnce((cmd, args, opts) =>
      opts.listeners.stdout(JSON.stringify(DNSListJSON)),
    );
    exec.exec.mockResolvedValue(0);

    await configureDomains('staging', 'testrunner', 'no');
    expect(exec.exec).toHaveBeenCalledTimes(18);
  });

  test('It can check that firewall rule already exists', async () => {
    exec.exec.mockResolvedValueOnce('199.199.199.199');
    exec.exec.mockRejectedValueOnce(0);
    exec.exec.mockImplementationOnce((cmd, args, opts) =>
      opts.listeners.stdout(JSON.stringify(DNSListJSON)),
    );
    exec.exec.mockResolvedValue(0);

    await configureDomains('staging', 'testrunner', 'no');
    expect(exec.exec).toHaveBeenCalledTimes(18);
    expect(core.info).toHaveBeenNthCalledWith(
      3,
      'Firewall rule already exists!',
    );
    expect(core.info).toHaveBeenCalledTimes(13);
  });

  test('It can check that healthcheck already exists', async () => {
    exec.exec.mockResolvedValueOnce('199.199.199.199');
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockImplementationOnce((cmd, args, opts) =>
      opts.listeners.stdout(JSON.stringify(DNSListJSON)),
    );
    exec.exec.mockRejectedValueOnce(0);

    await configureDomains('staging', 'testrunner', 'no');
    expect(exec.exec).toHaveBeenCalledTimes(18);
    expect(core.info).toHaveBeenNthCalledWith(
      6,
      'Health check already exists!',
    );
    expect(core.info).toHaveBeenCalledTimes(13);
  });

  test('It can check that bucket already exists', async () => {
    exec.exec.mockResolvedValueOnce('199.199.199.199');
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockImplementationOnce((cmd, args, opts) =>
      opts.listeners.stdout(JSON.stringify(DNSListJSON)),
    );
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockRejectedValueOnce(0);

    await configureDomains('staging', 'testrunner', 'no');
    expect(exec.exec).toHaveBeenCalledTimes(17);
    expect(core.info).toHaveBeenNthCalledWith(7, 'Bucket already exists!');
    expect(core.info).toHaveBeenCalledTimes(13);
  });

  test('It can check that loadbalancer already exists', async () => {
    exec.exec.mockResolvedValueOnce('199.199.199.199');
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockImplementationOnce((cmd, args, opts) =>
      opts.listeners.stdout(JSON.stringify(DNSListJSON)),
    );
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockRejectedValueOnce(0);

    await configureDomains('staging', 'testrunner', 'no');
    expect(exec.exec).toHaveBeenCalledTimes(18);
    expect(core.info).toHaveBeenNthCalledWith(
      8,
      'Loadbalancer already exists!',
    );
    expect(core.info).toHaveBeenCalledTimes(13);
  });

  test('It can update https proxy with new domains', async () => {
    const newDomains =
      'testrunner-se.txengine.retailsvc.dev,testrunner-dk.txengine.retailsvc.dev,testrunner-no.txengine.retailsvc.dev';
    handleCertificates.mockResolvedValueOnce(newDomains);
    exec.exec.mockResolvedValueOnce('199.199.199.199');
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockImplementationOnce((cmd, args, opts) =>
      opts.listeners.stdout(JSON.stringify(DNSListJSON)),
    );
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockRejectedValueOnce(0);

    await configureDomains('staging', 'testrunner', 'no');
    expect(exec.exec).toHaveBeenCalledTimes(20);
    expect(core.info).toHaveBeenCalledTimes(13);
    expect(exec.exec).toHaveBeenNthCalledWith(
      9,
      'gcloud',
      [
        'compute',
        'target-https-proxies',
        'update',
        'https-lb-proxy',
        '--url-map=txengine-lb',
        `--ssl-certificates=${newDomains}`,
        '--project=experience-staging-b807',
      ],
      expect.anything(),
    );
  });

  test('It can check that http proxy already exists', async () => {
    exec.exec.mockResolvedValueOnce('199.199.199.199');
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockImplementationOnce((cmd, args, opts) =>
      opts.listeners.stdout(JSON.stringify(DNSListJSON)),
    );
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockRejectedValueOnce(0);

    await configureDomains('staging', 'testrunner', 'no');
    expect(exec.exec).toHaveBeenCalledTimes(18);
    expect(core.info).toHaveBeenNthCalledWith(9, 'Http proxy already exists!');
    expect(core.info).toHaveBeenCalledTimes(13);
  });

  test('It can check that forwarding rule already exists', async () => {
    exec.exec.mockResolvedValueOnce('199.199.199.199');
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockImplementationOnce((cmd, args, opts) =>
      opts.listeners.stdout(JSON.stringify(DNSListJSON)),
    );
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockRejectedValueOnce(0);

    await configureDomains('staging', 'testrunner', 'no');
    expect(exec.exec).toHaveBeenCalledTimes(18);
    expect(core.info).toHaveBeenNthCalledWith(
      10,
      'Forwarding rule already exists!',
    );
    expect(core.info).toHaveBeenCalledTimes(13);
  });

  test('It can check that backend service already exists', async () => {
    exec.exec.mockResolvedValueOnce('199.199.199.199');
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockImplementationOnce((cmd, args, opts) =>
      opts.listeners.stdout(JSON.stringify(DNSListJSON)),
    );
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockRejectedValueOnce(0);

    await configureDomains('staging', 'testrunner', 'no');
    expect(exec.exec).toHaveBeenCalledTimes(18);
    expect(core.info).toHaveBeenNthCalledWith(
      11,
      'Backend service already exists!',
    );
    expect(core.info).toHaveBeenCalledTimes(13);
  });

  test('It can check that backend is already added to service', async () => {
    exec.exec.mockResolvedValueOnce('199.199.199.199');
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockImplementationOnce((cmd, args, opts) =>
      opts.listeners.stdout(JSON.stringify(DNSListJSON)),
    );
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockRejectedValueOnce(0);

    await configureDomains('staging', 'testrunner', 'no');
    expect(exec.exec).toHaveBeenCalledTimes(18);
    expect(core.info).toHaveBeenNthCalledWith(
      12,
      'Backend already added to service!',
    );
    expect(core.info).toHaveBeenCalledTimes(13);
  });

  test('It can throw error if NEGs is not created', async () => {
    exec.exec.mockResolvedValueOnce('199.199.199.199');
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockImplementationOnce((cmd, args, opts) =>
      opts.listeners.stdout(JSON.stringify(DNSListJSON)),
    );
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockRejectedValueOnce(0);

    await expect(
      configureDomains('staging', 'testrunner', 'no'),
    ).rejects.toEqual(
      new Error('The NEG was not found! make sure the deployment is correct'),
    );
    expect(exec.exec).toHaveBeenCalledTimes(13);
    expect(core.info).toHaveBeenCalledTimes(11);
  });

  test('It can check backend-url-mapping already exists', async () => {
    exec.exec.mockResolvedValueOnce('199.199.199.199');
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockImplementationOnce((cmd, args, opts) =>
      opts.listeners.stdout(JSON.stringify(DNSListJSON)),
    );
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockRejectedValueOnce(0);

    await configureDomains('staging', 'testrunner', 'no');
    expect(exec.exec).toHaveBeenCalledTimes(18);
    expect(core.info).toHaveBeenNthCalledWith(
      13,
      'Url-mapping already exists!',
    );
    expect(core.info).toHaveBeenCalledTimes(13);
  });

  test('It can init tenant name and fullDNS correctly', async () => {
    exec.exec.mockResolvedValueOnce('199.199.199.199');
    exec.exec.mockResolvedValueOnce(0);
    exec.exec.mockImplementationOnce((cmd, args, opts) =>
      opts.listeners.stdout(JSON.stringify(DNSListJSON)),
    );
    exec.exec.mockResolvedValue(0);

    await configureDomains('staging', 'testrunner', 'no');
    expect(exec.exec).toHaveBeenCalledTimes(18);
    expect(core.info).toHaveBeenCalledTimes(12);

    expect(exec.exec).toHaveBeenNthCalledWith(
      18,
      'gcloud',
      [
        'compute',
        'url-maps',
        'add-path-matcher',
        'txengine-lb',
        '--project=experience-staging-b807',
        '--default-service=testrunner-no-txengine',
        '--path-matcher-name=testrunner-no-posserver',
        '--path-rules=/ReferenceDataWebService=testrunner-no-posserver',
        '--global',
        '--new-hosts=testrunner-no.txengine.retailsvc.dev',
      ],
      expect.anything(),
    );
  });
});
