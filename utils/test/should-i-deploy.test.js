const axios = require('axios');
const github = require('@actions/github');
const shouldIDeploy = require('../src/should-i-deploy');

jest.mock('axios');
jest.mock('@actions/core');
jest.mock('@actions/github');

beforeEach(() => {
  jest.resetAllMocks();
});

it('should complete without throwing when deployment is recommended', async () => {
  github.context.payload = {
    head_commit: {
      message: 'feat: Cool new feature'
    }
  };

  axios.get.mockResolvedValue({
    data: {
      shouldideploy: true,
      message: 'Harder better faster stronger',
    },
  });

  await expect(shouldIDeploy()).resolves.not.toThrow();
});

it('should fail when deployment is not recommended', async () => {
  github.context.payload = {
    head_commit: {
      message: 'docs: Updated readme'
    }
  };

  axios.get.mockResolvedValue({
    data: {
      shouldideploy: false,
      message: 'No, better not.',
    },
  });

  await expect(shouldIDeploy()).rejects.toThrow('Deployment is not recommended today.');
});

it('should deploy to staging regardless', async () => {
  const env = 'staging';
  github.context.payload = {
    head_commit: {
      message: 'feat: Cool new feature'
    }
  };

  axios.get.mockResolvedValue({
    data: {
      shouldideploy: true,
      message: 'Harder better faster stronger',
    },
  });

  await expect(shouldIDeploy(env)).resolves.not.toThrow();
  expect(axios.get).not.toHaveBeenCalled();
});

it('should deploy when commit message includes [force deploy]', async () => {
  github.context.payload = {
    head_commit: {
      message: 'feat: Cool new feature [force deploy]'
    }
  };

  await expect(shouldIDeploy()).resolves.not.toThrow();
  expect(axios.get).not.toHaveBeenCalled();
});

it('should handle network or other errors', async () => {
  github.context.payload = {
    head_commit: {
      message: 'feat: Cool new feature'
    }
  };

  axios.get.mockRejectedValue(new Error('Network error'));

  await expect(shouldIDeploy()).rejects.toThrow('Failed to check deployment status');
});
