// Make sure we get a mocked FS.
import fs from 'fs';
import mockFs from 'mock-fs';
import os from 'os';
import path from 'path';
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from 'vitest';

vi.mock('@actions/exec');
vi.mock('@actions/core');
vi.mock('../../utils/src/versions.js');
vi.mock('../src/nexus-credentials.js');

import * as core from '@actions/core';
import * as exec from '@actions/exec';

import versions from '../../utils/src/versions.js';
import action from '../src/index.js';
import mvn from '../src/mvn.js';
import loadNexusCredentials from '../src/nexus-credentials.js';

const orgEnv = process.env;
const defaultArgs = '-B -V';

describe('Maven', () => {
  afterAll(() => {
    mockFs.restore();
  });

  const getFs = (workingDir) => {
    const settingsPath = path.resolve(
      path.join(__dirname, '../src/extenda-maven-settings.xml'),
    );
    const garSettingsPath = path.resolve(
      path.join(__dirname, '../src/extenda-maven-gar-settings.xml'),
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
    fileSystem[garSettingsPath] = '<extenda-gar />';
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
    vi.resetAllMocks();
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
    const spy = vi.spyOn(os, 'platform');
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
    const spy = vi.spyOn(os, 'platform');
    spy.mockReturnValueOnce('win32');
    exec.exec.mockResolvedValueOnce(0);

    await mvn.run('help:effective-pom');
    expect(exec.exec).toHaveBeenCalledWith(
      `./mvnw.cmd ${defaultArgs} help:effective-pom`,
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
      vi.resetAllMocks();
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

    test('It uses artifact registry when extensions present', async () => {
      core.getInput
        .mockReturnValueOnce('compile')
        .mockReturnValueOnce('1.0.0')
        .mockReturnValueOnce('service-account-key');

      const fileSystem = getFs();
      fileSystem['.mvn/extensions.xml'] =
        '<artifactId>artifactregistry-maven-wagon</artifactId>';
      mockFs(fileSystem);

      await action();
      expect(
        fs.readFileSync(path.join(os.homedir(), '.m2', 'settings.xml'), 'utf8'),
      ).toEqual('<extenda-gar />');
      expect(core.exportVariable).toHaveBeenCalledWith(
        'ARTIFACT_REGISTRY_AUTH',
        'service-account-key',
      );
      expect(loadNexusCredentials).not.toHaveBeenCalled();
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
