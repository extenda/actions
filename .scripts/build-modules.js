import esbuild from 'esbuild';
import fs from 'fs-extra';
import path from 'path';

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

  console.time(`build ${baseDir}`);
  await esbuild.build({
    entryPoints: [`${srcDir}/index.js`],
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
