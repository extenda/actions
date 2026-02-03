import { readFile } from 'fs';
import mockFs from 'mock-fs';
import { join } from 'path';

import { createNpmrcFile } from '../src/npmrc';

const expectedNpmrcForInstall = `
@hiiretail:registry = https://repo.extendaretail.com/repository/npm-group/
//repo.extendaretail.com/repository/npm-group/:email = nexus@extenda.com
//repo.extendaretail.com/repository/npm-group/:always-auth = true
//repo.extendaretail.com/repository/npm-group/:_auth = dXNlcm5hbWU6cGFzc3dvcmQ=
`;

const expectedNpmrcForPublish = `
@hiiretail:registry = https://repo.extendaretail.com/repository/npm-private/
//repo.extendaretail.com/repository/npm-private/:email = nexus@extenda.com
//repo.extendaretail.com/repository/npm-private/:always-auth = true
//repo.extendaretail.com/repository/npm-private/:_auth = dXNlcm5hbWU6cGFzc3dvcmQ=
`;

describe('npmrc', () => {
  afterEach(() => {
    jest.resetAllMocks();
    mockFs.restore();
  });

  it('saves file to specified folder (for install)', async () => {
    mockFs({ '~/output': {} });

    await createNpmrcFile({
      credentials: { username: 'username', password: 'password' },
      outputDir: '~/output',
    });

    const contents = await readFile(join('~/output', '.npmrc'), {
      encoding: 'utf-8',
    });
    expect(contents).toEqual(expectedNpmrcForInstall);
  });

  it('saves file to specified folder (for publish)', async () => {
    mockFs({ '~/output': {} });

    await createNpmrcFile({
      credentials: { username: 'username', password: 'password' },
      authForPublishing: true,
      outputDir: '~/output',
    });

    const contents = await readFile(join('~/output', '.npmrc'), {
      encoding: 'utf-8',
    });
    expect(contents).toEqual(expectedNpmrcForPublish);
  });
});
