import { afterAll, afterEach, describe, expect, test, vi } from 'vitest';
vi.mock('@actions/core');
vi.mock('child_process');

import * as core from '@actions/core';
import cp from 'child_process';
import mockFs from 'mock-fs';

import * as docker from '../src/docker.js';

describe('core and cp methods', () => {
  afterEach(() => {
    core.getInput.mockReset();
    core.setFailed.mockReset();
    cp.execSync.mockReset();
  });

  afterAll(() => {
    core.getInput.mockRestore();
    core.setFailed.mockRestore();
    cp.execSync.mockRestore();
    mockFs.restore();
  });

  describe('Build image', () => {
    test('No Dockerfile', () => {
      mockFs({});
      const dockerfile = 'Dockerfile.nonexistent';
      core.getInput.mockReturnValue(dockerfile);
      docker.build('gcr.io/some-project/image:v1');
      expect(core.setFailed).toHaveBeenCalledWith(
        `Dockerfile does not exist in location ${dockerfile}`,
      );
    });

    test('Dockerfile exists', () => {
      const dockerfile = 'Dockerfile';
      const dockerContext = 'folder';
      const tags = ['v1'];
      const image = 'gcr.io/some-project/image';

      mockFs({
        Dockerfile: '',
        folder: {},
      });

      core.getInput.mockReturnValueOnce(dockerfile);
      core.getInput.mockReturnValueOnce(dockerContext);

      docker.build(image, null, tags);
      expect(cp.execSync).toHaveBeenCalledWith(
        `docker build -f ${dockerfile} -t ${image}:${tags[0]} ${dockerContext}`,
      );
    });

    test('Multiple tags', () => {
      const dockerfile = 'Dockerfile';
      const dockerContext = 'folder';
      const tags = ['v2', 'latest'];
      const image = 'gcr.io/some-project/image';

      mockFs({
        Dockerfile: '',
        folder: {},
      });

      core.getInput.mockReturnValueOnce(dockerfile);
      core.getInput.mockReturnValueOnce(dockerContext);

      docker.build(image, null, tags);
      expect(cp.execSync).toHaveBeenCalledWith(
        `docker build -f ${dockerfile} -t ${image}:${tags[0]} -t ${image}:${tags[1]} ${dockerContext}`,
      );
    });

    test('Build with build args', () => {
      const dockerfile = 'Dockerfile';
      const dockerContext = 'folder';
      const image = 'docker.io/this-project/that-image';
      const buildArgs = ['VERSION=latest', 'BUILD_DATE=2020-01-14'];

      mockFs({
        Dockerfile: '',
        folder: {},
      });

      core.getInput.mockReturnValueOnce(dockerfile);
      core.getInput.mockReturnValueOnce(dockerContext);

      docker.build(image, buildArgs);
      expect(cp.execSync).toHaveBeenCalledWith(
        `docker build -f Dockerfile -t ${image} --build-arg VERSION=latest --build-arg BUILD_DATE=2020-01-14 ${dockerContext}`,
      );
    });
  });

  describe('Registry login', () => {
    test('Docker Hub login', () => {
      const registry = 'docker.io';
      const username = 'user';
      const password = 'areallysecurepassword';

      core.getInput.mockReturnValueOnce(username).mockReturnValueOnce(password);

      docker.login(registry);

      expect(cp.execSync).toHaveBeenCalledWith(
        `docker login -u ${username} --password-stdin ${registry}`,
        {
          input: password,
        },
      );
    });

    test('ECR login', () => {
      const registry = '123456789123.dkr.ecr.us-east-1.amazonaws.com';

      core.getInput
        .mockReturnValueOnce(registry)
        .mockReturnValueOnce('')
        .mockReturnValueOnce('');

      cp.execSync.mockReturnValueOnce('JWT');

      docker.login(registry);

      expect(cp.execSync).toHaveBeenCalledWith(
        'aws ecr get-login-password --region us-east-1',
      );
      expect(cp.execSync).toHaveBeenCalledWith(
        `docker login -u AWS --password-stdin ${registry}`,
        { input: 'JWT' },
      );
    });

    test("returns undefined if empty login and doesn't execute command", () => {
      core.getInput
        .mockReturnValueOnce('')
        .mockReturnValueOnce('')
        .mockReturnValueOnce('');

      docker.login(undefined);

      expect(cp.execSync.mock.calls.length).toEqual(0);
    });
  });

  describe('Docker push', () => {
    test('Docker Hub push', () => {
      const imageName = 'gcr.io/my-project/image:v1';

      docker.push(imageName);

      expect(cp.execSync).toHaveBeenCalledWith(`docker push ${imageName}`);
    });
  });
});
