import { modules } from './modules';

(async () => {
  await modules.exec(() => ['npm audit fix'], false);
})();
