jest.mock('@actions/core');

const core = require('@actions/core');
const cp = require('child_process');
const fs = require('fs');
const docker = require('../src/docker.js');
// const maxBufferSize = require('../src/settings');

describe('core and cp methods', () => {
  core.getInput = jest.fn();
  core.setFailed = jest.fn();
  cp.execSync = jest.fn();
  fs.existsSync = jest.fn();

  afterEach(() => {
    core.getInput.mockReset();
    core.setFailed.mockReset();
    cp.execSync.mockReset();
    fs.existsSync.mockReset();
  });

  afterAll(() => {
    core.getInput.mockRestore();
    core.setFailed.mockRestore();
    cp.execSync.mockRestore();
    fs.existsSync.mockRestore();
  });

  describe('Build image', () => {
    test('No Dockerfile', () => {
      const dockerfile = 'Dockerfile.nonexistent';
      core.getInput.mockReturnValue(dockerfile);
      fs.existsSync.mockReturnValueOnce(false);

      docker.build('gcr.io/some-project/image:v1');
      expect(fs.existsSync).toHaveBeenCalledWith(dockerfile);
      expect(core.setFailed).toHaveBeenCalledWith(`Dockerfile does not exist in location ${dockerfile}`);
    });

    test('Dockerfile exists', () => {
      core.getInput.mockReturnValue('Dockerfile');
      fs.existsSync.mockReturnValueOnce(true);
      const image = 'gcr.io/some-project/image:v1';

      docker.build(image);
      expect(fs.existsSync).toHaveBeenCalledWith('Dockerfile');
      expect(cp.execSync).toHaveBeenCalledWith(`docker build -f Dockerfile -t ${image} .`); // , {
      // maxBuffer: maxBufferSize,
      // });
    });

    test('Build with build args', () => {
      core.getInput.mockReturnValue('Dockerfile');
      fs.existsSync.mockReturnValueOnce(true);
      const image = 'docker.io/this-project/that-image:latest';
      const buildArgs = ['VERSION=latest', 'BUILD_DATE=2020-01-14'];

      docker.build(image, buildArgs);
      expect(fs.existsSync).toHaveBeenCalledWith('Dockerfile');
      expect(cp.execSync).toHaveBeenCalledWith(
        `docker build -f Dockerfile -t ${image} --build-arg VERSION=latest --build-arg BUILD_DATE=2020-01-14 .`,
      ); // ,
      // {
      //   maxBuffer: maxBufferSize,
      // },
      // );
    });
  });

  describe('Registry login', () => {
    test('Docker Hub login', () => {
      const registry = 'docker.io';
      const username = 'mrsmithers';
      const password = 'areallysecurepassword';

      core.getInput
        .mockReturnValueOnce(registry)
        .mockReturnValueOnce(username)
        .mockReturnValueOnce(password);

      docker.login();

      expect(cp.execSync).toHaveBeenCalledWith(`docker login -u ${username} --password-stdin ${registry}`, {
        input: password,
      });
    });

    test('ECR login', () => {
      const registry = '123456789123.dkr.ecr.us-east-1.amazonaws.com';

      core.getInput
        .mockReturnValueOnce(registry)
        .mockReturnValueOnce('')
        .mockReturnValueOnce('');

      docker.login();

      expect(cp.execSync).toHaveBeenCalledWith('$(aws ecr get-login --region us-east-1 --no-include-email)');
    });

    test("returns undefined if empty login and doesn't execute command", () => {
      core.getInput
        .mockReturnValueOnce('')
        .mockReturnValueOnce('')
        .mockReturnValueOnce('');

      docker.login();

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
