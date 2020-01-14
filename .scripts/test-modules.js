const { npmArgument, modules } = require('./modules');

(async () => {
  await modules.exec(`npm ${npmArgument}`);
})();
