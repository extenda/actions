const os = require('os');
const fs = require('fs');
const path = require('path');

jest.mock('os', () => ({
  homedir: () => '.',
}));

const mvn = require('../src/mvn');

describe('Maven', () => {
  afterAll(() => {
    fs.unlinkSync(path.join('./.m2/settings.xml'));
    fs.rmdirSync('./.m2');
    fs.rmdirSync('./.repository');
  });

  test('Copy settings', async () => {
    await mvn.copySettings();
    const exists = fs.existsSync(path.join(os.homedir(), '.m2', 'settings.xml'));
    expect(exists).toEqual(true);
  });

  test('Build success', async () => {
    const status = await mvn.run('--version');
    expect(status).toEqual(0);
  });

  test('Build failure', async () => {
    const status = await mvn.run('-f missing-pom.xml package').catch(() => 1);
    expect(status).toEqual(1);
  });
});
