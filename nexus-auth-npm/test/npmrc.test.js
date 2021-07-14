const mockFs = require('mock-fs');
const { readFile } = require('fs').promises;
const { join } = require('path');
const { createNpmrcFile } = require('../src/npmrc');

const expectedNpmrc = `
@hiiretail:registry = https://repo.extendaretail.com/repository/npm-group/
//repo.extendaretail.com/repository/npm-group/:email = nexus@extenda.com
//repo.extendaretail.com/repository/npm-group/:always-auth = true
//repo.extendaretail.com/repository/npm-group/:_auth = dXNlcm5hbWU6cGFzc3dvcmQ=
`;

describe('npmrc', () => {
  afterEach(() => {
    jest.resetAllMocks();
    mockFs.restore();
  });

  it('saves file to specified folder', async () => {
    mockFs({ '~/output': {} });

    await createNpmrcFile({
      credentials: { username: 'username', password: 'password' },
      outputDir: '~/output',
    });

    const contents = await readFile(join('~', '.npmrc'), { encoding: 'utf-8' });
    expect(contents).toEqual(expectedNpmrc);
  });
});
