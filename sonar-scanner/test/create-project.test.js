import * as core from '@actions/core';
import axios from 'axios';

jest.mock('axios');
jest.mock('@actions/core');
jest.mock('../src/sonar-credentials', () => ({
  sonarAuth: jest.fn(),
}));

import { createProject } from '../src/create-project.js';
import { sonarAuth } from '../src/sonar-credentials.js';

const orgEnv = process.env;

describe('Create Project', () => {
  beforeAll(() => {
    process.env = { ...orgEnv };
    process.env.GITHUB_REPOSITORY = 'extenda/actions';
  });

  afterAll(() => {
    process.env = orgEnv;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    sonarAuth.mockResolvedValue({ username: 'token', password: '' });
  });

  describe('Non-SonarCloud hosts', () => {
    test('It resolves immediately for non-SonarCloud hosts', async () => {
      await expect(
        createProject('https://sonar.extenda.io'),
      ).resolves.toBeUndefined();
      expect(axios.get).not.toHaveBeenCalled();
      expect(axios.post).not.toHaveBeenCalled();
    });

    test('It resolves immediately for SonarQube', async () => {
      await expect(
        createProject('https://sonarqube.io'),
      ).resolves.toBeUndefined();
      expect(axios.get).not.toHaveBeenCalled();
    });
  });

  describe('SonarCloud - Project exists', () => {
    beforeEach(() => {
      axios.get.mockResolvedValue({
        data: {
          components: [{ key: 'extenda_actions' }],
        },
      });
    });

    test('It does not create project when it already exists', async () => {
      await createProject('https://sonarcloud.io');
      expect(axios.get).toHaveBeenCalledWith(
        'https://sonarcloud.io/api/projects/search?organization=extenda&q=extenda_actions',
        expect.objectContaining({ auth: expect.any(Object) }),
      );
      expect(axios.post).not.toHaveBeenCalled();
      expect(core.debug).toHaveBeenCalledWith(
        "Project 'extenda_actions' exists in https://sonarcloud.io",
      );
    });

    test('It does not create mono-repo project when it already exists', async () => {
      axios.get.mockResolvedValue({
        data: {
          components: [{ key: 'extenda_actions_submodule' }],
        },
      });
      await createProject('https://sonarcloud.io', './build/submodule');
      expect(axios.get).toHaveBeenCalledWith(
        'https://sonarcloud.io/api/projects/search?organization=extenda&q=extenda_actions_submodule',
        expect.objectContaining({ auth: expect.any(Object) }),
      );
      expect(axios.post).not.toHaveBeenCalled();
    });
  });

  describe('SonarCloud - Project does not exist', () => {
    beforeEach(() => {
      axios.get.mockResolvedValue({
        data: {
          components: [],
        },
      });
      axios.post.mockResolvedValue({});
    });

    test('It creates project when it does not exist', async () => {
      await createProject('https://sonarcloud.io');
      expect(axios.post).toHaveBeenCalledWith(
        'https://sonarcloud.io/api/projects/create',
        'name=actions&organization=extenda&project=extenda_actions',
        expect.objectContaining({
          auth: expect.any(Object),
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
          },
        }),
      );
      expect(core.info).toHaveBeenCalledWith(
        "Created project 'extenda_actions' in https://sonarcloud.io",
      );
    });

    test('It creates mono-repo project with suffix', async () => {
      await createProject('https://sonarcloud.io', './build/submodule');
      expect(axios.post).toHaveBeenCalledWith(
        'https://sonarcloud.io/api/projects/create',
        'name=actions%20%7C%20submodule&organization=extenda&project=extenda_actions_submodule',
        expect.objectContaining({
          auth: expect.any(Object),
        }),
      );
      expect(core.info).toHaveBeenCalledWith(
        "Created project 'extenda_actions_submodule' in https://sonarcloud.io",
      );
    });

    test('It handles root working directory', async () => {
      await createProject('https://sonarcloud.io', '.');
      expect(axios.post).toHaveBeenCalledWith(
        'https://sonarcloud.io/api/projects/create',
        'name=actions&organization=extenda&project=extenda_actions',
        expect.any(Object),
      );
    });
  });

  describe('SonarCloud - Error handling', () => {
    beforeEach(() => {
      axios.get.mockResolvedValue({
        data: {
          components: [],
        },
      });
    });

    test('It logs error when project creation fails', async () => {
      axios.post.mockRejectedValue(new Error('API Error'));
      await createProject('https://sonarcloud.io');
      expect(core.error).toHaveBeenCalledWith(
        "Failed to create 'extenda_actions' in https://sonarcloud.io",
      );
    });
  });

  describe('Project exists edge cases', () => {
    test('It handles empty components array', async () => {
      axios.get.mockResolvedValue({
        data: {
          components: [],
        },
      });
      axios.post.mockResolvedValue({});
      await createProject('https://sonarcloud.io');
      expect(axios.post).toHaveBeenCalled();
    });

    test('It handles components with different key', async () => {
      axios.get.mockResolvedValue({
        data: {
          components: [{ key: 'different_project' }],
        },
      });
      axios.post.mockResolvedValue({});
      await createProject('https://sonarcloud.io');
      expect(axios.post).toHaveBeenCalled();
    });

    test('It handles undefined components', async () => {
      axios.get.mockResolvedValue({
        data: {},
      });
      axios.post.mockResolvedValue({});
      await createProject('https://sonarcloud.io');
      expect(axios.post).toHaveBeenCalled();
    });
  });
});
