const { modules } = require('./modules');

(async () => {
  await modules.exec('npm run build');
})();
