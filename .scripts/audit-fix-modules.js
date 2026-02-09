import { modules } from './modules.js';

(async () => {
  await modules.exec(() => ['npm audit fix'], false);
})();
