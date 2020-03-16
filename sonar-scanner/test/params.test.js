const path = require('path');
const params = require('../src/params.js');

const orgEnv = process.env;

describe('Sonar Parameters', () => {
  beforeAll(() => {
    process.env = { ...orgEnv };
    process.env.GITHUB_REF = 'master';
    process.env.GITHUB_REPOSITORY = 'extenda/actions';
    process.env.SONAR_TOKEN = 'x';
  });

  afterAll(() => {
    process.env = orgEnv;
  });

  describe('Main Branch', () => {
    beforeEach(() => {
      process.env.GITHUB_EVENT_PATH = path.join(__dirname, 'push-event.json');
    });

    test('Extra Parameters', () => {
      const result = params.createParams(
        'https://sonarcloud.io',
        'master',
        false,
        { extra: 'test' },
      );
      expect(result).toContain('-Dextra=test');
    });

    test('SonarCloud', () => {
      const result = params.createParams('https://sonarcloud.io', 'master');
      expect(result).toContain('-Dsonar.login=x');
      expect(result).toContain('-Dsonar.host.url=https://sonarcloud.io');
      expect(result).toContain('-Dsonar.organization=extenda');
      expect(result).toContain('-Dsonar.projectName=actions');
      expect(result).toContain('-Dsonar.projectKey=extenda_actions');
      expect(result).not.toContain('-Dsonar.pullrequest');
      expect(result).not.toContain('-Dsonar.branch.name');
    });

    test('SonarQube', () => {
      const result = params.createParams('https://sonar.extenda.io', 'master');
      expect(result).toContain('-Dsonar.login=x');
      expect(result).toContain('-Dsonar.host.url=https://sonar.extenda.io');
      expect(result).toContain('-Dsonar.projectName=actions');
      expect(result).not.toContain('-Dsonar.branch.name');
    });

    test('MS Params', () => {
      const result = params.createParams('https://sonarcloud.io', 'master', true);
      expect(result).toContain('/d:sonar.login="x"');
      expect(result).toContain('/d:sonar.host.url="https://sonarcloud.io"');
      expect(result).toContain('/o:"extenda"');
      expect(result).toContain('/n:"actions"');
      expect(result).toContain('/k:"extenda_actions"');
      expect(result).not.toContain('/d:sonar.pullrequest=');
      expect(result).not.toContain('/d:sonar.branch.name=');
    });
  });

  describe('Feature Branch', () => {
    beforeEach(() => {
      process.env.GITHUB_REF = 'feature/test';
    });

    test('SonarCloud', () => {
      const result = params.createParams('https://sonarcloud.io', 'master');
      expect(result).toContain('-Dsonar.branch.name=feature/test');
    });
  });

  describe('Pull Request', () => {
    beforeEach(() => {
      process.env.GITHUB_REF = 'feature/test';
      process.env.GITHUB_EVENT_PATH = path.join(__dirname, 'pull-request.json');
    });

    test('SonarCloud', () => {
      const result = params.createParams('https://sonarcloud.io', 'master');
      expect(result).toContain('-Dsonar.login=');
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

    test('SonarQube', () => {
      const result = params.createParams('https://sonar.extenda.io', 'master');
      expect(result).toContain('-Dsonar.login=x');
      expect(result).toContain('-Dsonar.host.url=https://sonar.extenda.io');
      expect(result).toContain('-Dsonar.projectName=actions');
      expect(result).toContain('-Dsonar.github.oauth=');
      expect(result).toContain('-Dsonar.analysis.mode=preview');
      expect(result).toContain('-Dsonar.github.repository=extenda/actions');
      expect(result).toContain('-Dsonar.github.pullRequest=1');
    });
  });
});
