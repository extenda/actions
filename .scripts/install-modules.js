import { modules, npmArgument } from './modules.js';

(async () => {
  if (!/-D|--save/.test(npmArgument)) {
    const installCommand =
      npmArgument === 'ci' ? 'npm ci' : 'npm install --no-bin-links';
    await modules.exec(installCommand);
  }
})();
