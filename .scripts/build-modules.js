import path from 'node:path';

import esbuild from 'esbuild';
import fs from 'fs-extra';

import generateDependabot from './generate-dependabot-yml.js';
import { modules } from './modules.js';

const copyStaticAssetsPlugin = ({ sourceDir, destDir, filesToCopy }) => ({
  name: 'copy-static-assets',
  setup(build) {
    build.onEnd(() => {
      const files = fs.readdirSync(sourceDir, { withFileTypes: true });
      files.forEach((file) => {
        if (filesToCopy.some((regex) => regex.test(file.name))) {
          fs.copyFileSync(
            path.join(sourceDir, file.name),
            path.join(destDir, file.name),
          );
        }
      });
    });
  },
});

const build = async (baseDir) => {
  const srcDir = path.join(baseDir, 'src');
  const destDir = path.join(baseDir, 'dist');

  if (path.basename(baseDir) === 'utils') {
    // Skip building utils module
    return;
  }

  const virtualEntrypoint = `
import { run } from '../../utils/src/index.js';
import action from './index.js';

if (action !== undefined) {
  run(entryPoint);
}
`;

  console.time(`build ${baseDir}`);
  await esbuild.build({
    stdin: {
      contents: virtualEntrypoint,
      resolveDir: srcDir,
      loader: 'js',
      sourcefile: 'generated-entrypoint.js',
    },
    platform: 'node',
    format: 'cjs',
    bundle: true,
    minify: false,
    lineLimit: 120,
    keepNames: true,
    treeShaking: true,
    outfile: `${destDir}/index.cjs`,
    plugins: [
      copyStaticAssetsPlugin({
        sourceDir: srcDir,
        destDir,
        filesToCopy: [/\.xml$/],
      }),
    ],
  });

  console.timeEnd(`build ${baseDir}`);
};

(async () => {
  modules.each((dir) => {
    fs.removeSync(path.join(dir, 'dist'));
    build(dir);
  });
  generateDependabot();
})();
