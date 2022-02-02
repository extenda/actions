const { modules } = require('./modules');

(async () => {
  await modules.exec((dir) => ['npm audit fix']);
})();
