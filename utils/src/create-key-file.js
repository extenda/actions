const fs = require('fs');
const tmp = require('tmp');

tmp.setGracefulCleanup();

const createKeyFile = (serviceAccountKey) => {
  const tmpFile = tmp.fileSync({ postfix: '.json' });
  const jsonKey = Buffer.from(serviceAccountKey, 'base64').toString('utf8');
  fs.writeFileSync(tmpFile.name, jsonKey);
  return tmpFile.name;
};

module.exports = createKeyFile;
