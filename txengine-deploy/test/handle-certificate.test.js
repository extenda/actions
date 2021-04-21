const exec = require('@actions/exec');
const handleCertificates = require('../src/handle-certificate');

jest.mock('@actions/exec');

const certificateListJson = [{
  creationTimestamp: '2021-03-11T06:32:08.781-08:00',
  name: 'txengine-certs-v1',
  managed: {
    domains: [
      'testrunner-se.txengine.retailsvc.dev',
      'testrunner-dk.txengine.retailsvc.dev',
    ],
  },
}];

describe('handle certificates', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('It can handle certificates when domain exists', async () => {
    exec.exec.mockImplementationOnce((
      cmd, args, opts,
    ) => opts.listeners.stdout(JSON.stringify(certificateListJson)));
    exec.exec.mockResolvedValue(0);
    await handleCertificates('testrunner-se.txengine.retailsvc.dev', 'experience-staging-b807');
    expect(exec.exec).toHaveBeenCalledTimes(1);
  });

  test('It can handle certificates when domain doesnt exist', async () => {
    exec.exec.mockImplementationOnce((
      cmd, args, opts,
    ) => opts.listeners.stdout(JSON.stringify(certificateListJson)));
    exec.exec.mockResolvedValue(0);
    await handleCertificates('testrunner-no.txengine.retailsvc.dev', 'experience-staging-b807');
    expect(exec.exec).toHaveBeenCalledTimes(2);
    expect(exec.exec).toHaveBeenNthCalledWith(2, 'gcloud', [
      'compute',
      'ssl-certificates',
      'create',
      'txengine-certs-v2',
      '--domains=testrunner-se.txengine.retailsvc.dev,testrunner-dk.txengine.retailsvc.dev,testrunner-no.txengine.retailsvc.dev',
      '--project=experience-staging-b807',
      '--global',
    ],
    expect.anything());
  });

  test('It can handle certificates when domain doesnt exist and certificate limit is reached', async () => {
    const certificateListJsonMaxCert = [];
    let expectedResult = [];
    for (let i = 0; i < 13; i += 1) {
      const certificateJson = {
        creationTimestamp: `2021-03-${i + 10}T06:32:08.781-08:00`,
        name: `txengine-certs-v${i}`,
        managed: {
          domains: [
            'testrunner-se.txengine.retailsvc.dev',
            'testrunner-dk.txengine.retailsvc.dev',
          ],
        },
      };
      expectedResult.push(certificateJson.name);
      certificateListJsonMaxCert.push(certificateJson);
    }
    expectedResult.push('txengine-certs-v13');
    expectedResult.splice(expectedResult.indexOf('txengine-certs-v0'), 1);
    expectedResult = expectedResult.join(',');

    exec.exec.mockImplementationOnce((
      cmd, args, opts,
    ) => opts.listeners.stdout(JSON.stringify(certificateListJsonMaxCert)));
    exec.exec.mockResolvedValue(0);
    const newCertificates = await handleCertificates('testrunner-no.txengine.retailsvc.dev', 'experience-staging-b807');
    expect(newCertificates).toEqual(expectedResult);
    expect(exec.exec).toHaveBeenCalledTimes(3);
  });

  test('It can handle certificates when domain doesnt exist and certificate and domain limit is reached', async () => {
    const certificateListJsonMaxCert = [];
    const maxDomainList = [];
    let expectedResult = [];
    for (let i = 0; i < 100; i += 1) {
      maxDomainList.push(`testrunner-se${i}.txengine.retailsvc.dev`);
    }
    for (let i = 0; i < 13; i += 1) {
      let certificateJson = {};
      if (i === 0) {
        certificateJson = {
          creationTimestamp: `2021-03-${i + 10}T06:32:08.781-08:00`,
          name: `txengine-certs-v${i}`,
          managed: {
            domains: maxDomainList,
          },
        };
      } else {
        certificateJson = {
          creationTimestamp: `2021-03-${i + 10}T06:32:08.781-08:00`,
          name: `txengine-certs-v${i}`,
          managed: {
            domains: [
              'testrunner-se.txengine.retailsvc.dev',
              'testrunner-dk.txengine.retailsvc.dev',
            ],
          },
        };
      }
      expectedResult.push(certificateJson.name);
      certificateListJsonMaxCert.push(certificateJson);
    }
    expectedResult.push('txengine-certs-v13');
    expectedResult.splice(expectedResult.indexOf('txengine-certs-v1'), 1);
    expectedResult = expectedResult.join(',');

    exec.exec.mockImplementationOnce((
      cmd, args, opts,
    ) => opts.listeners.stdout(JSON.stringify(certificateListJsonMaxCert)));
    exec.exec.mockResolvedValue(0);
    const newCertificates = await handleCertificates('testrunner-no.txengine.retailsvc.dev', 'experience-staging-b807');
    expect(newCertificates).toEqual(expectedResult);
    expect(exec.exec).toHaveBeenCalledTimes(3);
  });

  test('It creates certificate with 1 domain when last created reaches max domains', async () => {
    const certificateListJsonMaxCert = [];
    const maxDomainList = [];
    let expectedResult = [];
    for (let i = 0; i < 100; i += 1) {
      maxDomainList.push(`testrunner-se${i}.txengine.retailsvc.dev`);
    }
    for (let i = 0; i < 13; i += 1) {
      let certificateJson = {};
      if (i === 5) {
        certificateJson = {
          creationTimestamp: '2021-03-29T06:32:08.781-08:00',
          name: `txengine-certs-v${i}`,
          managed: {
            domains: maxDomainList,
          },
        };
      } else {
        certificateJson = {
          creationTimestamp: `2021-03-${i + 10}T06:32:08.781-08:00`,
          name: `txengine-certs-v${i}`,
          managed: {
            domains: [
              'testrunner-se.txengine.retailsvc.dev',
              'testrunner-dk.txengine.retailsvc.dev',
            ],
          },
        };
      }
      expectedResult.push(certificateJson.name);
      certificateListJsonMaxCert.push(certificateJson);
    }
    expectedResult.push('txengine-certs-v13');
    expectedResult.splice(expectedResult.indexOf('txengine-certs-v0'), 1);
    expectedResult = expectedResult.join(',');

    exec.exec.mockImplementationOnce((
      cmd, args, opts,
    ) => opts.listeners.stdout(JSON.stringify(certificateListJsonMaxCert)));
    exec.exec.mockResolvedValue(0);
    const newCertificates = await handleCertificates('testrunner-no.txengine.retailsvc.dev', 'experience-staging-b807');
    expect(newCertificates).toEqual(expectedResult);
    expect(exec.exec).toHaveBeenCalledTimes(3);
    expect(exec.exec).toHaveBeenNthCalledWith(3, 'gcloud', [
      'compute',
      'ssl-certificates',
      'create',
      'txengine-certs-v13',
      '--domains=testrunner-no.txengine.retailsvc.dev',
      '--project=experience-staging-b807',
      '--global',
    ],
    expect.anything());
  });

  test('It creates certificate with 1 domain when last created reaches max domains', async () => {
    const certificateListJsonMaxCert = [];
    const maxDomainList = [];
    let expectedResult = [];
    for (let i = 0; i < 100; i += 1) {
      maxDomainList.push(`testrunner-se${i}.txengine.retailsvc.dev`);
    }
    for (let i = 0; i < 13; i += 1) {
      let certificateJson = {};
      if (i === 5) {
        certificateJson = {
          creationTimestamp: '2021-03-29T06:32:08.781-08:00',
          name: `txengine-certs-v${i}`,
          managed: {
            domains: maxDomainList,
          },
        };
      } else {
        certificateJson = {
          creationTimestamp: `2021-03-${i + 10}T06:32:08.781-08:00`,
          name: `txengine-certs-v${i}`,
          managed: {
            domains: [
              'testrunner-se.txengine.retailsvc.dev',
              'testrunner-dk.txengine.retailsvc.dev',
            ],
          },
        };
      }
      expectedResult.push(certificateJson.name);
      certificateListJsonMaxCert.push(certificateJson);
    }
    expectedResult.push('txengine-certs-v13');
    expectedResult.splice(expectedResult.indexOf('txengine-certs-v0'), 1);
    expectedResult = expectedResult.join(',');

    exec.exec.mockImplementationOnce((
      cmd, args, opts,
    ) => opts.listeners.stdout(JSON.stringify(certificateListJsonMaxCert)));
    exec.exec.mockResolvedValue(0);
    const newCertificates = await handleCertificates('testrunner-no.txengine.retailsvc.dev', 'experience-staging-b807');
    expect(newCertificates).toEqual(expectedResult);
    expect(exec.exec).toHaveBeenCalledTimes(3);
    expect(exec.exec).toHaveBeenNthCalledWith(3, 'gcloud', [
      'compute',
      'ssl-certificates',
      'create',
      'txengine-certs-v13',
      '--domains=testrunner-no.txengine.retailsvc.dev',
      '--project=experience-staging-b807',
      '--global',
    ],
    expect.anything());
  });
});
