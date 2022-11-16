const fs = require('fs-extra');
const path = require('path');
const { modules } = require('./modules');

const ncc = '../node_modules/@vercel/ncc/dist/ncc/cli.js';

const build = (file, out = 'dist') => `node ${ncc} build ${file} -o ${out} --target es2018`;

(async () => {
  modules.each((dir) => {
    fs.removeSync(path.join(dir, 'dist'));
  });
  await modules.exec((dir) => {
    const commands = [build('src/index.js')];
    const { actionHooks = {} } = JSON.parse(fs.readFileSync(path.join(dir, 'package.json')));
    Object.entries(actionHooks).forEach(([key, value]) => {
      commands.push(build(value, `dist/${key}`));
    });
    return commands;
  });
})();
