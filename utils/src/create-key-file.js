import fs from 'node:fs';

import tmp from 'tmp';

tmp.setGracefulCleanup();

const createKeyFile = (serviceAccountKey, { encoding = 'base64' } = {}) => {
  const tmpFile = tmp.fileSync({ postfix: '.json' });
  const jsonKey = Buffer.from(serviceAccountKey, encoding).toString('utf8');
  fs.writeFileSync(tmpFile.name, jsonKey);
  return tmpFile.name;
};

export default createKeyFile;
