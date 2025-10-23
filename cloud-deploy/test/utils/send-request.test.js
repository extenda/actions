const core = require('@actions/core');
const axios = require('axios');
const {
  sendScaleSetup,
  sendDeployInfo,
  sendDeployRequest,
} = require('../../src/utils/send-request');
const getToken = require('../../src/utils/identity-token');

jest.mock('@actions/core');
jest.mock('axios');
jest.mock('google-auth-library');
jest.mock('../../src/utils/identity-token');

const service = 'service-name';
const projectid = 'projectid';
const region = 'europe-west1';
const platform = 'cloud-run';
const mininstances = 1;
const scaleup = '08:00';
const scaledown = '20:00';
const timestamp = new Date().toISOString();
const version = 'v1.1.1';
const githubrepository = 'repository';
const githubsha = 'githubsha';
const slackchannel = 'slackchannel';

const serviceDef = {
  kubernetes: {
    type: 'Deployment',
    service: 'service-name',
    resources: {
      cpu: 1,
      memory: '512Mi',
    },
    protocol: 'http',
    scaling: {
      cpu: 40,
    },
  },
  security: 'none',
  labels: {
    product: 'actions',
    component: 'jest',
  },
  environments: {
    production: {
      'min-instances': 1,
      'max-instances': 10,
      env: {
        KEY1: 'value1',
        KEY2: 'value2',
      },
    },
    staging: {
      'min-instances': 1,
      'max-instances': 1,
      env: {},
      'domain-mappings': ['example.com'],
    },
  },
};

describe('Send request to platform api', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  it('should send scale setup request successfully', async () => {
    getToken.mockResolvedValue('token');
    axios.mockResolvedValue({ status: 200 });
    await sendScaleSetup(
      service,
      projectid,
      region,
      platform,
      mininstances,
      scaleup,
      scaledown,
    );
    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'post',
        url: '/scaling/setup',
        data: {
          service,
          projectid,
          region,
          platform,
          mininstances,
          scaleup,
          scaledown,
          scaled: true,
        },
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'bearer token',
        },
      }),
    );
    expect(core.info).toHaveBeenCalledWith(
      expect.stringContaining('/scaling/setup with response code 200'),
    );
  });

  it('should log error on request failure for sendScaleSetup', async () => {
    getToken.mockResolvedValue('token');
    axios.mockRejectedValue('some error');
    await sendScaleSetup(
      service,
      projectid,
      region,
      platform,
      mininstances,
      scaleup,
      scaledown,
    );
    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'post',
        url: '/scaling/setup',
        data: {
          service,
          projectid,
          region,
          platform,
          mininstances,
          scaleup,
          scaledown,
          scaled: true,
        },
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'bearer token',
        },
      }),
    );
    expect(core.error).toHaveBeenCalledWith(
      expect.stringContaining('some error'),
    );
  });
  it('should send deploy information request successfully', async () => {
    getToken.mockResolvedValue('token');
    axios.mockResolvedValue({ status: 200 });
    await sendDeployInfo(
      service,
      timestamp,
      version,
      projectid,
      githubrepository,
      githubsha,
      slackchannel,
    );
    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'post',
        url: '/deployinfo/add',
        data: {
          service,
          timestamp,
          version,
          projectid,
          githubrepository,
          githubsha,
          slackchannel,
        },
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'bearer token',
        },
      }),
    );
    expect(core.info).toHaveBeenCalledWith(
      expect.stringContaining('/deployinfo/add with response code 200'),
    );
  });

  it('should log error on request failure for sendDeployInfo', async () => {
    getToken.mockResolvedValue('token');
    axios.mockRejectedValue('some error');
    await sendDeployInfo(
      service,
      timestamp,
      version,
      projectid,
      githubrepository,
      githubsha,
      slackchannel,
    );
    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'post',
        url: '/deployinfo/add',
        data: {
          service,
          timestamp,
          version,
          projectid,
          githubrepository,
          githubsha,
          slackchannel,
        },
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'bearer token',
        },
      }),
    );
    expect(core.error).toHaveBeenCalledWith(
      expect.stringContaining('some error'),
    );
  });

  it('should send deploy setup request successfully', async () => {
    getToken.mockResolvedValue('token');
    axios.mockResolvedValue({ status: 200 });
    await sendDeployRequest(serviceDef);
    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'post',
        url: '/loadbalancer/deploy',
        data: serviceDef,
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'bearer token',
        },
      }),
    );
    expect(core.info).toHaveBeenCalledWith(
      expect.stringContaining('/loadbalancer/deploy with response code 200'),
    );
  });

  it('should send deploy setup request and fail the action on failure', async () => {
    getToken.mockResolvedValue('token');
    axios.mockRejectedValue({ status: 500, error: 'some error' });
    await expect(sendDeployRequest(serviceDef)).rejects.toEqual(
      new Error(
        'Deployment rolled out successfully! loadbalancer setup failed!',
      ),
    );
    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'post',
        url: '/loadbalancer/deploy',
        data: serviceDef,
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'bearer token',
        },
      }),
    );
  });

  it('should refresh canary status successfully', async () => {
    getToken.mockResolvedValue('token');
    axios.mockResolvedValue({ status: 200 });
    const data = { projectID: 'proj', serviceName: 'svc' };
    await expect(
      require('../../src/utils/send-request').refreshCanaryStatus(data),
    ).resolves.toBe(true);
    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'get',
        url: '/info/services?project=proj&service=svc',
        headers: expect.objectContaining({
          Authorization: 'bearer token',
        }),
      }),
    );
  });

  it('should throw if refresh canary status fails', async () => {
    getToken.mockResolvedValue('token');
    axios.mockRejectedValue('some error');
    const data = { projectID: 'proj', serviceName: 'svc' };
    await expect(
      require('../../src/utils/send-request').refreshCanaryStatus(data),
    ).rejects.toThrow(
      `Couldn't refresh canary status for service in platform api`,
    );
    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'get',
        url: '/info/services?project=proj&service=svc',
        headers: expect.objectContaining({
          Authorization: 'bearer token',
        }),
      }),
    );
  });
});
