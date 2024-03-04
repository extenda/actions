const core = require('@actions/core');
const axios = require('axios');
const sendScaleSetup = require('../../src/utils/send-request');
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

describe('Send request to platform api', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  it('should send scale setup request successfully', async () => {
    getToken.mockResolvedValue('token');
    axios.post.mockResolvedValue({ status: 200 });
    await sendScaleSetup(service, projectid, region, platform, mininstances, scaleup, scaledown);
    expect(axios.post).toHaveBeenCalledWith(
      '/scaling/setup',
      {
        service,
        projectid,
        region,
        platform,
        mininstances,
        scaleup,
        scaledown,
        scaled: true,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'bearer token',
        },
      },
    );
    expect(core.info).toHaveBeenCalledWith(expect.stringContaining('/scaling/setup with response code 200'));
  });

  it('should log error on request failure', async () => {
    getToken.mockResolvedValue('token');
    axios.post.mockRejectedValue('some error');
    await sendScaleSetup(service, projectid, region, platform, mininstances, scaleup, scaledown);
    expect(axios.post).toHaveBeenCalledWith(
      '/scaling/setup',
      {
        service,
        projectid,
        region,
        platform,
        mininstances,
        scaleup,
        scaledown,
        scaled: true,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'bearer token',
        },
      },
    );
    expect(core.error).toHaveBeenCalledWith(expect.stringContaining('some error'));
  });
});
