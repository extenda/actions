const path = require('path');
const fs = require('fs');

const root = path.join(__dirname, 'test-files');

const createFiles = (files) => {
  files.forEach((file) => {
    const dir = path.resolve(root, path.dirname(file));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.resolve(root, file), '', { encoding: 'utf8' });
  });
};

const removeFiles = () => {
  fs.rmSync(root, { recursive: true, force: true });
};

module.exports = {
  root,
  createFiles,
  removeFiles,
};
