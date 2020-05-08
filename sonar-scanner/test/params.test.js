const path = require('path');

jest.mock('../src/sonar-credentials');
jest.mock('../../utils/src/pull-request-info');

const { createParams } = require('../src/params');
const { getPullRequestInfo } = require('../../utils/src/pull-request-info');

const orgEnv = process.env;

describe('Sonar Parameters', () => {
  beforeAll(() => {
    process.env = { ...orgEnv };
    process.env.GITHUB_REF = 'master';
    process.env.GITHUB_REPOSITORY = 'extenda/actions';
  });

  afterAll(() => {
    process.env = orgEnv;
  });

  describe('Main Branch', () => {
    beforeEach(() => {
      process.env.GITHUB_EVENT_PATH = path.join(__dirname, 'push-event.json');
    });

    test('Extra Parameters', async () => {
      const result = await createParams(
        'https://sonarcloud.io',
        'master',
        false,
        { extra: 'test' },
      );
      expect(result).toContain('-Dextra=test');
    });

    test('SonarCloud', async () => {
      const result = await createParams('https://sonarcloud.io', 'master');
      expect(result).toContain('-Dsonar.login=sonar');
      expect(result).toContain('-Dsonar.host.url=https://sonarcloud.io');
      expect(result).toContain('-Dsonar.organization=extenda');
      expect(result).toContain('-Dsonar.projectName=actions');
      expect(result).toContain('-Dsonar.projectKey=extenda_actions');
      expect(result).not.toContain('-Dsonar.pullrequest');
      expect(result).not.toContain('-Dsonar.branch.name');
    });

    test('SonarQube', async () => {
      const result = await createParams('https://sonar.extenda.io', 'master');
      expect(result).toContain('-Dsonar.login=sonar');
      expect(result).toContain('-Dsonar.host.url=https://sonar.extenda.io');
      expect(result).toContain('-Dsonar.projectName=actions');
      expect(result).not.toContain('-Dsonar.branch.name');
    });

    test('MS Params', async () => {
      const result = await createParams('https://sonarcloud.io', 'master', true);
      expect(result).toContain('/d:sonar.login=sonar');
      expect(result).toContain('/d:sonar.host.url=https://sonarcloud.io');
      expect(result).toContain('/o:extenda');
      expect(result).toContain('/n:actions');
      expect(result).toContain('/k:extenda_actions');
      expect(result).not.toContain('/d:sonar.pullrequest=');
      expect(result).not.toContain('/d:sonar.branch.name=');
    });
  });

  describe('Feature Branch', () => {
    beforeEach(() => {
      process.env.GITHUB_REF = 'feature/test';
    });

    test('SonarCloud', async () => {
      const result = await createParams('https://sonarcloud.io', 'master');
      expect(result).toContain('-Dsonar.branch.name=feature/test');
    });
  });

  describe('Pull Request', () => {
    beforeEach(() => {
      process.env.GITHUB_REF = 'feature/test';
      process.env.GITHUB_EVENT_PATH = path.join(__dirname, 'pull-request.json');
      getPullRequestInfo.mockResolvedValueOnce({
        number: 1,
        base: { ref: 'master' },
        head: { ref: 'feature/test' },
      });
    });

    test('SonarCloud', async () => {
      const result = await createParams('https://sonarcloud.io', 'master');
      expect(result).toContain('-Dsonar.login=sonar');
      expect(result).toContain('-Dsonar.host.url=https://sonarcloud.io');
      expect(result).toContain('-Dsonar.organization=extenda');
      expect(result).toContain('-Dsonar.projectName=actions');
      expect(result).toContain('-Dsonar.projectKey=extenda_actions');

      expect(result).toContain('-Dsonar.pullrequest.base=master');
      expect(result).toContain('-Dsonar.pullrequest.branch=feature/test');
      expect(result).toContain('-Dsonar.pullrequest.key=1');
      expect(result).toContain('-Dsonar.pullrequest.provider=github');
      expect(result).toContain('-Dsonar.pullrequest.github.repository=extenda/actions');
    });

    test('sonar.extenda.io', async () => {
      const result = await createParams('https://sonar.extenda.io', 'master');
      expect(result).toContain('-Dsonar.login=sonar');
      expect(result).toContain('-Dsonar.host.url=https://sonar.extenda.io');
      expect(result).toContain('-Dsonar.projectName=actions');
      expect(result).toContain('-Dsonar.github.oauth=');
      expect(result).toContain('-Dsonar.analysis.mode=preview');
      expect(result).toContain('-Dsonar.github.repository=extenda/actions');
      expect(result).toContain('-Dsonar.github.pullRequest=1');
    });

    test('Any SonarQube', async () => {
      const result = await createParams('https://sonarqube.io', 'master');
      expect(result).toContain('-Dsonar.login=sonar');
      expect(result).toContain('-Dsonar.host.url=https://sonarqube.io');
      expect(result).toContain('-Dsonar.projectName=actions');
      expect(result).not.toContain('-Dsonar.analysis.mode=preview');
    });
  });

  test('It sets verbose flag', async () => {
    process.env.SONAR_VERBOSE = 'true';
    const result = await createParams('https://sonar.extenda.io', 'master');
    expect(result).toContain('-Dsonar.verbose=true');
  });
});
