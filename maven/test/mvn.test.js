const mockFs = require('mock-fs');
const path = require('path');
let fs = require('fs');

const os = require('os');

// Make sure we get a mocked FS.
fs = require('fs');

jest.mock('@actions/exec');
jest.mock('@actions/core');
jest.mock('../../utils/src/versions');
jest.mock('../src/nexus-credentials');
jest.mock('../../setup-gcloud');
const exec = require('@actions/exec');
const core = require('@actions/core');
const versions = require('../../utils/src/versions');
const loadNexusCredentials = require('../src/nexus-credentials');

const mvn = require('../src/mvn');
const action = require('../src/index');

const orgEnv = process.env;
const defaultArgs = '-B -V --no-transfer-progress';

describe('Maven', () => {
  afterAll(() => {
    mockFs.restore();
  });

  const getFs = (workingDir) => {
    const settingsPath = path.resolve(
      path.join(__dirname, '../src/extenda-maven-settings.xml'),
    );
    const gcpSettingsPath = path.resolve(
      path.join(__dirname, '../src/extenda-maven-gcp-settings.xml'),
    );
    const abalonPath = path.resolve(
      path.join(__dirname, '../src/AbalonAb-maven-settings.xml'),
    );

    let fileSystem = {
      test: {
        'pom.xml': '<project />',
      },
    };

    if (workingDir) {
      fileSystem = {
        [workingDir]: fileSystem,
      };
    }

    fileSystem[settingsPath] = '<extenda />';
    fileSystem[gcpSettingsPath] = '<extenda-gar />';
    fileSystem[abalonPath] = '<abalon />';
    return fileSystem;
  };

  beforeEach(() => {
    process.env = { ...orgEnv };

    mockFs(getFs());

    // Make sure core.group executes callbacks.
    core.group.mockImplementation((name, fn) => fn());
  });

  afterEach(() => {
    jest.resetAllMocks();
    process.env = orgEnv;
  });

  test('Copy settings', async () => {
    await mvn.copySettings();
    const exists = fs.existsSync(
      path.join(os.homedir(), '.m2', 'settings.xml'),
    );
    expect(exists).toEqual(true);
    expect(
      fs.readFileSync(path.join(os.homedir(), '.m2', 'settings.xml'), 'utf8'),
    ).toEqual('<extenda />');
  });

  test('Copy extenda settings', async () => {
    process.env.GITHUB_REPOSITORY = 'extenda/test-repo';
    await mvn.copySettings();
    const exists = fs.existsSync(
      path.join(os.homedir(), '.m2', 'settings.xml'),
    );
    expect(exists).toEqual(true);
    expect(
      fs.readFileSync(path.join(os.homedir(), '.m2', 'settings.xml'), 'utf8'),
    ).toEqual('<extenda />');
  });

  test('Copy default settings', async () => {
    process.env.GITHUB_REPOSITORY = 'github/test-repo';
    await mvn.copySettings();
    const exists = fs.existsSync(
      path.join(os.homedir(), '.m2', 'settings.xml'),
    );
    expect(exists).toEqual(true);
    expect(
      fs.readFileSync(path.join(os.homedir(), '.m2', 'settings.xml'), 'utf8'),
    ).toEqual('<extenda />');
  });

  test('Copy GAR settings', async () => {
    process.env.GITHUB_REPOSITORY = 'extenda/test-repo';
    const result = await mvn.copySettings(true);
    expect(result).toEqual(true);
    const exists = fs.existsSync(
      path.join(os.homedir(), '.m2', 'settings.xml'),
    );
    expect(exists).toEqual(true);
    expect(
      fs.readFileSync(path.join(os.homedir(), '.m2', 'settings.xml'), 'utf8'),
    ).toEqual('<extenda-gar />');
  });

  test('Copy Abalon settings', async () => {
    process.env.GITHUB_REPOSITORY = 'AbalonAb/test-repo';
    await mvn.copySettings();
    const exists = fs.existsSync(
      path.join(os.homedir(), '.m2', 'settings.xml'),
    );
    expect(exists).toEqual(true);
    expect(
      fs.readFileSync(path.join(os.homedir(), '.m2', 'settings.xml'), 'utf8'),
    ).toEqual('<abalon />');
  });

  test('Build success', async () => {
    exec.exec.mockResolvedValueOnce(0);
    const status = await mvn.run('--version');
    expect(status).toEqual(0);
    expect(exec.exec).toHaveBeenCalledTimes(1);
    expect(exec.exec).toHaveBeenCalledWith(
      `mvn ${defaultArgs} --version`,
      undefined,
      { cwd: './' },
    );
  });

  test('Build success', async () => {
    exec.exec.mockResolvedValueOnce(0);
    const status = await mvn.run('-f test/pom.xml package').catch(() => 1);
    expect(status).toEqual(0);
    expect(exec.exec).toHaveBeenCalledWith(
      `mvn ${defaultArgs} -f test/pom.xml package`,
      undefined,
      { cwd: './' },
    );
  });

  test('Build failure', async () => {
    exec.exec.mockResolvedValueOnce(1);
    const status = await mvn.run('-f missing-pom.xml package').catch(() => 1);
    expect(status).toEqual(1);
    expect(exec.exec).toHaveBeenCalledWith(
      `mvn ${defaultArgs} -f missing-pom.xml package`,
      undefined,
      { cwd: './' },
    );
  });

  test('It supports maven wrapper (linux)', async () => {
    mockFs({
      mvnw: '',
      'mvnw.cmd': '',
    });
    const spy = jest.spyOn(os, 'platform');
    spy.mockReturnValueOnce('linux');
    exec.exec.mockResolvedValueOnce(0);

    await mvn.run('help:effective-pom');
    expect(exec.exec).toHaveBeenCalledWith(
      `./mvnw ${defaultArgs} help:effective-pom`,
      undefined,
      { cwd: './' },
    );

    spy.mockRestore();
  });

  test('It supports maven wrapper (win32)', async () => {
    mockFs({
      mvnw: '',
      'mvnw.cmd': '',
    });
    const spy = jest.spyOn(os, 'platform');
    spy.mockReturnValueOnce('win32');
    exec.exec.mockResolvedValueOnce(0);

    await mvn.run('help:effective-pom');
    expect(exec.exec).toHaveBeenCalledWith(
      `mvnw.cmd ${defaultArgs} help:effective-pom`,
      undefined,
      { cwd: './' },
    );
    spy.mockRestore();
  });

  describe('Action', () => {
    beforeEach(() => {
      process.env.NEXUS_USERNAME = 'user';
      process.env.NEXUS_PASSWORD = 'pwd';
      versions.getBuildVersion.mockResolvedValue('1.0.0-SNAPSHOT');
      loadNexusCredentials.mockResolvedValueOnce(null);
    });

    afterEach(() => {
      jest.resetAllMocks();
    });

    test('It resolves nexus-credentials', async () => {
      delete process.env.NEXUS_USERNAME;

      core.getInput
        .mockReturnValueOnce('compile')
        .mockReturnValueOnce('pom.xml')
        .mockReturnValueOnce('service-account-key')
        .mockReturnValueOnce('nexus-username')
        .mockReturnValueOnce('nexus-password');

      await action();
      expect(loadNexusCredentials).toHaveBeenCalled();
    });

    test('It initializes Maven once', async () => {
      core.getInput.mockReturnValue('package');
      exec.exec.mockResolvedValue(0);
      await action();
      expect(exec.exec).toHaveBeenCalledTimes(1);
      expect(exec.exec).toHaveBeenCalledWith(
        `mvn ${defaultArgs} package`,
        undefined,
        { cwd: 'package' },
      );
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
      expect(exec.exec).toHaveBeenCalledWith(
        `mvn ${defaultArgs} package`,
        undefined,
        { cwd: './' },
      );
    });

    test('It honors workingDir if provided', async () => {
      mockFs(getFs('abc'));

      core.getInput
        .mockReturnValueOnce('package')
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce('./abc/test');
      exec.exec.mockResolvedValueOnce(1);

      await action();

      // expect(exec.exec).toHaveBeenCalledTimes(2);
      expect(exec.exec).toHaveBeenNthCalledWith(
        1,
        `mvn ${defaultArgs} versions:set -DnewVersion=1.0.0-SNAPSHOT -DgenerateBackupPoms=false`,
        undefined,
        { cwd: './abc/test' },
      );
      expect(exec.exec).toHaveBeenNthCalledWith(
        2,
        `mvn ${defaultArgs} package`,
        undefined,
        { cwd: './abc/test' },
      );
    });

    test('It will update version once for existing POM', async () => {
      core.getInput.mockReturnValueOnce('package -f test/pom.xml');
      exec.exec.mockResolvedValue(0);

      await action();

      expect(versions.getBuildVersion).toHaveBeenCalled();
      expect(exec.exec).toHaveBeenCalledTimes(2);
      expect(exec.exec).toHaveBeenNthCalledWith(
        1,
        `mvn ${defaultArgs} versions:set -DnewVersion=1.0.0-SNAPSHOT -DgenerateBackupPoms=false`,
        undefined,
        { cwd: './' },
      );
      expect(exec.exec).toHaveBeenNthCalledWith(
        2,
        `mvn ${defaultArgs} package -f test/pom.xml`,
        undefined,
        { cwd: './' },
      );

      core.getInput.mockReturnValueOnce('package');
      await action();
      expect(exec.exec).toHaveBeenCalledTimes(3);
      expect(exec.exec).toHaveBeenNthCalledWith(
        3,
        `mvn ${defaultArgs} package`,
        undefined,
        { cwd: './' },
      );
    });

    test('It will honor original version if set as pom.xml', async () => {
      core.getInput
        .mockReturnValueOnce('package -f test/pom.xml')
        .mockReturnValueOnce('pom.xml');
      exec.exec.mockResolvedValue(0);

      await action();

      expect(versions.getBuildVersion).not.toHaveBeenCalled();
      expect(exec.exec).toHaveBeenCalledTimes(1);
      expect(exec.exec).toHaveBeenCalledWith(
        `mvn ${defaultArgs} package -f test/pom.xml`,
        undefined,
        { cwd: './' },
      );
    });

    test('It will set explicit version when defined', async () => {
      core.getInput
        .mockReturnValueOnce('package -f test/pom.xml')
        .mockReturnValueOnce('2.0.0');
      exec.exec.mockResolvedValue(0);

      await action();

      expect(versions.getBuildVersion).not.toHaveBeenCalled();
      expect(exec.exec).toHaveBeenCalledTimes(2);
      expect(exec.exec).toHaveBeenNthCalledWith(
        1,
        `mvn ${defaultArgs} versions:set -DnewVersion=2.0.0 -DgenerateBackupPoms=false`,
        undefined,
        { cwd: './' },
      );
      expect(exec.exec).toHaveBeenNthCalledWith(
        2,
        `mvn ${defaultArgs} package -f test/pom.xml`,
        undefined,
        { cwd: './' },
      );
    });

    test('It accounts for using working dir setting', async () => {
      core.getInput
        .mockReturnValueOnce('package')
        .mockReturnValueOnce('2.0.0')
        .mockReturnValueOnce('serviceAccountKey')
        .mockReturnValueOnce('nexusUsernameSecretName')
        .mockReturnValueOnce('nexus-password-secret-name')
        .mockReturnValueOnce('nested-directory/test');
      exec.exec.mockResolvedValue(0);

      mockFs(getFs('nested-directory'));

      await action();

      expect(core.warning).not.toHaveBeenCalled();
      expect(versions.getBuildVersion).not.toHaveBeenCalled();
      expect(exec.exec).toHaveBeenCalledTimes(2);
      expect(exec.exec).toHaveBeenNthCalledWith(
        1,
        `mvn ${defaultArgs} versions:set -DnewVersion=2.0.0 -DgenerateBackupPoms=false`,
        undefined,
        { cwd: 'nested-directory/test' },
      );
      expect(exec.exec).toHaveBeenNthCalledWith(
        2,
        `mvn ${defaultArgs} package`,
        undefined,
        { cwd: 'nested-directory/test' },
      );
    });
  });
});
