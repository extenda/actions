import { globSync } from 'fast-glob';

const resolveServiceFiles = (filesGlob) =>
  globSync(filesGlob, { onlyFiles: true });

module.exports = resolveServiceFiles;
