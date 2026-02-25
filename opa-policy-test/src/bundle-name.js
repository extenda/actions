import fs from 'node:fs';

import * as core from '@actions/core';
import yaml from 'yaml';

const readFromServiceFile = (fileName) => {
  if (!fs.existsSync(fileName)) {
    throw new Error(`Not found: ${fileName}`);
  }

  const def = yaml.parse(fs.readFileSync(fileName, 'utf-8'));

  const {
    'cloud-run': { service: cloudRunService } = {},
    kubernetes: { service: gkeService } = {},
    security: { 'permission-prefix': permissionPrefix } = {},
  } = def;

  return {
    serviceName: cloudRunService || gkeService,
    permissionPrefix,
  };
};

const createBundleName = (
  permissionPrefix,
  serviceName,
  serviceEnvironment,
) => {
  if (!permissionPrefix) {
    throw new Error("Missing 'permission-prefix'");
  }
  if (!serviceName) {
    throw new Error("Missing 'service-name'");
  }

  const env = serviceEnvironment || 'staging';

  return `${permissionPrefix}.${serviceName}-${env}.tar.gz`;
};

const getBundleName = () => {
  let bundleName;
  try {
    bundleName = createBundleName(
      core.getInput('permission-prefix'),
      core.getInput('service-name'),
      core.getInput('service-environment'),
    );
  } catch {
    const serviceFilePath =
      core.getInput('service-file-path') || 'cloud-deploy.yaml';
    core.info(`Read service definition from ${serviceFilePath}`);
    const { permissionPrefix, serviceName } =
      readFromServiceFile(serviceFilePath);
    bundleName = createBundleName(
      permissionPrefix,
      serviceName,
      core.getInput('service-environment'),
    );
  }
  return bundleName;
};

export default getBundleName;
