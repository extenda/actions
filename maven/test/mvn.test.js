const path = require('path');
let fs = require('fs');

const mockFs = require('mock-fs');

const os = require('os');

// Make sure we get a mocked FS.
fs = require('fs');

jest.mock('@actions/exec');
jest.mock('@actions/core');
jest.mock('../../utils/src/versions');
const exec = require('@actions/exec');
const core = require('@actions/core');
const versions = require('../../utils/src/versions');

const mvn = require('../src/mvn');
const action = require('../src/index');

const orgEnv = process.env;

describe('Maven', () => {
  afterAll(() => {
    mockFs.restore();
  });

  beforeEach(() => {
    process.env = { ...orgEnv };
    const settingsPath = path.resolve(path.join(__dirname, '../src/extenda-maven-settings.xml'));
    const abalonPath = path.resolve(path.join(__dirname, '../src/AbalonAb-maven-settings.xml'));
    const fileSystem = {
      test: {
        'pom.xml': '<project />',
      },
    };
    fileSystem[settingsPath] = '<extenda />';
    fileSystem[abalonPath] = '<abalon />';
    mockFs(fileSystem);

    // Make sure core.group executes callbacks.
    core.group.mockImplementation((name, fn) => fn());
  });

  afterEach(() => {
    jest.resetAllMocks();
    process.env = orgEnv;
  });

  test('Copy settings', async () => {
    await mvn.copySettings();
    const exists = fs.existsSync(path.join(os.homedir(), '.m2', 'settings.xml'));
    expect(exists).toEqual(true);
    expect(fs.readFileSync(path.join(os.homedir(), '.m2', 'settings.xml'), 'utf8'))
      .toEqual('<extenda />');
  });

  test('Copy extenda settings', async () => {
    process.env.GITHUB_REPOSITORY = 'extenda/test-repo';
    await mvn.copySettings();
    const exists = fs.existsSync(path.join(os.homedir(), '.m2', 'settings.xml'));
    expect(exists).toEqual(true);
    expect(fs.readFileSync(path.join(os.homedir(), '.m2', 'settings.xml'), 'utf8'))
      .toEqual('<extenda />');
  });

  test('Copy default settings', async () => {
    process.env.GITHUB_REPOSITORY = 'github/test-repo';
    await mvn.copySettings();
    const exists = fs.existsSync(path.join(os.homedir(), '.m2', 'settings.xml'));
    expect(exists).toEqual(true);
    expect(fs.readFileSync(path.join(os.homedir(), '.m2', 'settings.xml'), 'utf8'))
      .toEqual('<extenda />');
  });

  test('Copy Abalon settings', async () => {
    process.env.GITHUB_REPOSITORY = 'AbalonAb/test-repo';
    await mvn.copySettings();
    const exists = fs.existsSync(path.join(os.homedir(), '.m2', 'settings.xml'));
    expect(exists).toEqual(true);
    expect(fs.readFileSync(path.join(os.homedir(), '.m2', 'settings.xml'), 'utf8'))
      .toEqual('<abalon />');
  });

  test('Build success', async () => {
    exec.exec.mockResolvedValueOnce(0);
    const status = await mvn.run('--version');
    expect(status).toEqual(0);
    expect(exec.exec).toHaveBeenCalledTimes(1);
    expect(exec.exec).toHaveBeenCalledWith('mvn -B -V --version');
  });

  test('Build success', async () => {
    exec.exec.mockResolvedValueOnce(0);
    const status = await mvn.run('-f test/pom.xml package').catch(() => 1);
    expect(status).toEqual(0);
    expect(exec.exec).toHaveBeenCalledWith('mvn -B -V -f test/pom.xml package');
  });

  test('Build failure', async () => {
    exec.exec.mockResolvedValueOnce(1);
    const status = await mvn.run('-f missing-pom.xml package').catch(() => 1);
    expect(status).toEqual(1);
    expect(exec.exec).toHaveBeenCalledWith('mvn -B -V -f missing-pom.xml package');
  });

  describe('Action', () => {
    beforeEach(() => {
      process.env.NEXUS_USERNAME = 'user';
      process.env.NEXUS_PASSWORD = 'pwd';
      versions.getBuildVersion.mockResolvedValue('1.0.0-SNAPSHOT');
    });

    test('It requires Nexus credentials', async () => {
      delete process.env.NEXUS_USERNAME;
      await expect(action()).rejects.toEqual(new Error('Missing env var: NEXUS_USERNAME'));
    });

    test('It initializes Maven once', async () => {
      core.getInput.mockReturnValue('package');
      exec.exec.mockResolvedValue(0);
      await action();
      expect(exec.exec).toHaveBeenCalledTimes(1);
      expect(exec.exec).toHaveBeenCalledWith('mvn -B -V package');
      expect(core.exportVariable).toHaveBeenCalledTimes(1);
      expect(core.exportVariable).toHaveBeenCalledWith('MAVEN_INIT', 'true');
      process.env.MAVEN_INIT = 'true';
      await action();
      expect(core.exportVariable).toHaveBeenCalledTimes(1);
    });

    test('It skips versioning for missing POM', async () => {
      core.getInput.mockReturnValueOnce('package');
      exec.exec.mockResolvedValueOnce(1);
      await action();
      expect(exec.exec).toHaveBeenCalledTimes(1);
      expect(exec.exec).toHaveBeenCalledWith('mvn -B -V package');
    });

    test('It will update version once for existing POM', async () => {
      core.getInput.mockReturnValueOnce('package -f test/pom.xml');
      exec.exec.mockResolvedValue(0);

      await action();

      expect(versions.getBuildVersion).toHaveBeenCalled();
      expect(exec.exec).toHaveBeenCalledTimes(2);
      expect(exec.exec).toHaveBeenNthCalledWith(
        1,
        'mvn -B -V versions:set -DnewVersion=1.0.0-SNAPSHOT -DgenerateBackupPoms=false',
      );
      expect(exec.exec).toHaveBeenNthCalledWith(2, 'mvn -B -V package -f test/pom.xml');

      core.getInput.mockReturnValueOnce('package');
      await action();
      expect(exec.exec).toHaveBeenCalledTimes(3);
      expect(exec.exec).toHaveBeenNthCalledWith(3, 'mvn -B -V package');
    });

    test('It will honor original version if set as pom.xml', async () => {
      core.getInput.mockReturnValueOnce('package -f test/pom.xml')
        .mockReturnValueOnce('pom.xml');
      exec.exec.mockResolvedValue(0);

      await action();

      expect(versions.getBuildVersion).not.toHaveBeenCalled();
      expect(exec.exec).toHaveBeenCalledTimes(1);
      expect(exec.exec).toHaveBeenCalledWith('mvn -B -V package -f test/pom.xml');
    });

    test('It will set explicit version when defined', async () => {
      core.getInput.mockReturnValueOnce('package -f test/pom.xml')
        .mockReturnValueOnce('2.0.0');
      exec.exec.mockResolvedValue(0);

      await action();

      expect(versions.getBuildVersion).not.toHaveBeenCalled();
      expect(exec.exec).toHaveBeenCalledTimes(2);
      expect(exec.exec).toHaveBeenNthCalledWith(
        1,
        'mvn -B -V versions:set -DnewVersion=2.0.0 -DgenerateBackupPoms=false',
      );
      expect(exec.exec).toHaveBeenNthCalledWith(2, 'mvn -B -V package -f test/pom.xml');
    });
  });
});
