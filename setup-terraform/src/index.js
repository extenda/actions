import fs from 'node:fs';
import path from 'node:path';

import * as core from '@actions/core';
import os from 'os';
import semver from 'semver';

import { loadTool } from '../../utils/src/index.js';

const fromFile = (file) => {
  if (fs.existsSync(file)) {
    return fs.readFileSync(file, 'utf8').trim();
  }
  throw new Error(`File not found: ${file}`);
};

const loadVersion = (name, defaultValue) => {
  let version = core.getInput(name) || defaultValue;
  if (!semver.valid(version)) {
    version = fromFile(version);
  }
  if (!semver.valid(version)) {
    throw new Error(`Invalid semver version: ${version}`);
  }
  return version;
};

const platform = () => {
  const p = os.platform();
  return p === 'win32' ? 'windows' : p;
};

const action = async () => {
  const terraformVersion = loadVersion(
    'terraform-version',
    '.terraform-version',
  );

  await loadTool({
    tool: 'terraform',
    binary: platform() === 'windows' ? 'terraform.exe' : 'terraform',
    version: terraformVersion,
    downloadUrl: `https://releases.hashicorp.com/terraform/${terraformVersion}/terraform_${terraformVersion}_${platform()}_amd64.zip`,
  }).then((terraform) => {
    if (platform() !== 'windows') {
      fs.chmodSync(terraform, '777');
    }
    core.addPath(path.dirname(terraform));
  });

  const skipTerragrunt = core.getInput('skip-terragrunt') || 'false';

  if (skipTerragrunt !== 'true') {
    const terragruntVersion = loadVersion(
      'terragrunt-version',
      '.terragrunt-version',
    );

    await loadTool({
      tool: 'terragrunt',
      binary: platform() === 'windows' ? 'terragrunt.exe' : 'terragrunt',
      version: terragruntVersion,
      downloadUrl: `https://github.com/gruntwork-io/terragrunt/releases/download/v${terragruntVersion}/terragrunt_${platform()}_amd64${platform() === 'windows' ? '.exe' : ''}`,
    }).then((terragrunt) => {
      if (platform() !== 'windows') {
        fs.chmodSync(terragrunt, '777');
      }
      core.addPath(path.dirname(terragrunt));
    });
  }
};

export default action;

export { action, platform };
