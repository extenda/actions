const { modules } = require('./modules');

(async () => {
  await modules.exec(() => ['npm audit fix'], false);
})();
