jest.mock('@actions/core');
jest.mock('child_process');
jest.mock('fs');

const core = require('@actions/core');
const cp = require('child_process');
const fs = require('fs');

const docker = require('../src/docker.js');
// const maxBufferSize = require('../src/settings');

describe('core and cp methods', () => {
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
      const dockerfile = 'Dockerfile';
      const dockerContext = 'folder';
      const tags = ['v1'];
      const image = 'gcr.io/some-project/image';

      core.getInput.mockReturnValueOnce(dockerfile);
      core.getInput.mockReturnValueOnce(dockerContext);
      fs.existsSync.mockReturnValueOnce(true);

      docker.build(image, null, tags);
      expect(fs.existsSync).toHaveBeenCalledWith(dockerfile);
      expect(cp.execSync).toHaveBeenCalledWith(`docker build -f ${dockerfile} -t ${image}:${tags[0]} ${dockerContext}`);
    });

    test('Multiple tags', () => {
      const dockerfile = 'Dockerfile';
      const dockerContext = 'folder';
      const tags = ['v2', 'latest'];
      const image = 'gcr.io/some-project/image';

      core.getInput.mockReturnValueOnce(dockerfile);
      core.getInput.mockReturnValueOnce(dockerContext);
      fs.existsSync.mockReturnValueOnce(true);

      docker.build(image, null, tags);
      expect(fs.existsSync).toHaveBeenCalledWith(dockerfile);
      expect(cp.execSync).toHaveBeenCalledWith(`docker build -f ${dockerfile} -t ${image}:${tags[0]} -t ${image}:${tags[1]} ${dockerContext}`);
    });

    test('Build with build args', () => {
      const dockerfile = 'Dockerfile';
      const dockerContext = 'folder';
      const image = 'docker.io/this-project/that-image';
      const buildArgs = ['VERSION=latest', 'BUILD_DATE=2020-01-14'];

      core.getInput.mockReturnValueOnce(dockerfile);
      core.getInput.mockReturnValueOnce(dockerContext);
      fs.existsSync.mockReturnValueOnce(true);

      docker.build(image, buildArgs);
      expect(fs.existsSync).toHaveBeenCalledWith(dockerfile);
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

      core.getInput
        .mockReturnValueOnce(username)
        .mockReturnValueOnce(password);

      docker.login(registry);

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

      docker.login(registry);

      expect(cp.execSync).toHaveBeenCalledWith('$(aws ecr get-login-password --region us-east-1 --no-include-email)');
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
