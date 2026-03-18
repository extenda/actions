import path from 'node:path';

import esbuild from 'esbuild';
import fs from 'fs-extra';

const shouldCopyFile = (fileName, filesToCopy) =>
  filesToCopy.some((regex) => regex.test(fileName));

const copyStaticAssetsPlugin = ({ sourceDir, destDir, filesToCopy }) => ({
  name: 'copy-static-assets',
  setup(build) {
    build.onEnd(() => {
      const files = fs.readdirSync(sourceDir, { withFileTypes: true });
      files.forEach((file) => {
        if (shouldCopyFile(file.name, filesToCopy)) {
          fs.copyFileSync(
            path.join(sourceDir, file.name),
            path.join(destDir, file.name),
          );
        }
      });
    });
  },
});

export const buildWorkspace = async (baseDir = process.cwd()) => {
  const workspaceDir = path.resolve(baseDir);
  const workspaceName = path.basename(workspaceDir);
  const packageJsonPath = path.join(workspaceDir, 'package.json');
  const srcDir = path.join(workspaceDir, 'src');
  const destDir = path.join(workspaceDir, 'dist');

  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(`No package.json found in workspace: ${workspaceDir}`);
  }

  if (workspaceName === 'utils') {
    return;
  }

  const virtualEntrypoint = `
import { run } from '../../utils/src/index.js';
import action from './index.js';

if (action === undefined) {
  throw new Error('Missing entrypoint in GitHub Action! Add "export default action;" to your index.js');
}

run(action);
`;

  fs.removeSync(destDir);

  console.time(`build ${workspaceDir}`);
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
  console.timeEnd(`build ${workspaceDir}`);
};

await buildWorkspace();
