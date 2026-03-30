import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import esbuild from 'esbuild';
import yaml from 'js-yaml';

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

const shouldCopyFile = (fileName, filesToCopy) =>
  filesToCopy.some((regex) => regex.test(fileName));

const readActionRunsConfig = (workspaceDir) => {
  const actionPath = path.join(workspaceDir, 'action.yml');
  if (!fs.existsSync(actionPath)) {
    return {};
  }

  const content = fs.readFileSync(actionPath, 'utf8');
  const parsed = yaml.load(content);
  if (!parsed || typeof parsed !== 'object') {
    return {};
  }

  return parsed.runs && typeof parsed.runs === 'object' ? parsed.runs : {};
};

const resolveLifecycleEntrypoints = ({ workspaceDir, srcDir, runsConfig }) => {
  const lifecycleSteps = ['pre', 'post'];

  return lifecycleSteps
    .map((step) => {
      const configuredOutfile = runsConfig[step];
      if (typeof configuredOutfile !== 'string') {
        return null;
      }

      // For node actions, we assume dist/<name>.cjs maps to src/<name>.js.
      const outfile = path.resolve(workspaceDir, configuredOutfile);
      const outBaseName = path.basename(configuredOutfile, '.cjs');
      const sourceFile = path.join(srcDir, `${outBaseName}.js`);

      if (!fs.existsSync(sourceFile)) {
        throw new Error(
          `Missing ${step} source file for ${configuredOutfile}: ${sourceFile}`,
        );
      }

      return {
        step,
        outfile,
        sourceFile,
      };
    })
    .filter(Boolean);
};

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
  const runsConfig = readActionRunsConfig(workspaceDir);
  const lifecycleEntrypoints = resolveLifecycleEntrypoints({
    workspaceDir,
    srcDir,
    runsConfig,
  });

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

  fs.rmSync(destDir, { recursive: true, force: true });

  const sharedBuildOptions = {
    platform: 'node',
    format: 'cjs',
    bundle: true,
    minify: false,
    lineLimit: 120,
    keepNames: true,
    treeShaking: true,
    absWorkingDir: rootDir,
    plugins: [
      copyStaticAssetsPlugin({
        sourceDir: srcDir,
        destDir,
        filesToCopy: [/\.xml$/],
      }),
    ],
  };

  console.time(`build ${workspaceDir}`);
  await esbuild.build({
    ...sharedBuildOptions,
    stdin: {
      contents: virtualEntrypoint,
      resolveDir: srcDir,
      loader: 'js',
      sourcefile: 'generated-entrypoint.js',
    },
    outfile: `${destDir}/index.cjs`,
  });

  for (const lifecycleEntrypoint of lifecycleEntrypoints) {
    await esbuild.build({
      ...sharedBuildOptions,
      entryPoints: [lifecycleEntrypoint.sourceFile],
      outfile: lifecycleEntrypoint.outfile,
    });
  }

  console.timeEnd(`build ${workspaceDir}`);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await buildWorkspace();
}
