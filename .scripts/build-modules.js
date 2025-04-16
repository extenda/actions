const fs = require('fs-extra');
const path = require('path');
const esbuild = require('esbuild');
const { modules } = require('./modules');
const generateDependabot = require('./generate-dependabot-yml');

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
    outfile: `${destDir}/index.js`,
    treeShaking: true,
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
