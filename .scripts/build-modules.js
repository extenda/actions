const fs = require('fs-extra');
const path = require('path');
const { modules } = require('./modules');

(async () => {
  modules.each((dir) => {
    fs.removeSync(path.join(dir, 'dist'));
  });
  await modules.exec('npm run build');
})();
