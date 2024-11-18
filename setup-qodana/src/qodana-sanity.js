const core = require('@actions/core');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const defaultConfig = (projectType, projectDirectory) => {
  const qodanaYaml = {
    version: '1.0',
    ide: projectType.ide,
    profile: {
      name: 'qodana.recommended',
    },
    failureConditions: {
      severityThresholds: {
        critical: 0,
        high: 0,
        moderate: 0,
      },
      testCoverageThresholds: {
        fresh: 80,
        total: 80,
      },
    },
  };

  fs.writeFileSync(
    path.resolve(projectDirectory, 'qodana.yaml'),
    yaml.dump(qodanaYaml, 'utf-8'),
    'utf-8',
  );
};

const validateConfig = (projectType, projectDirectory) => {
  const qodanaYaml = yaml.load(
    fs.readFileSync(path.resolve(projectDirectory, 'qodana.yaml'), 'utf-8'),
  );
  const {
    ide,
    linter,
    failureConditions: {
      severityThresholds: { critical = 0 } = {},
      testCoverageThresholds: { fresh = 0, total = 0 } = {},
    } = {},
  } = qodanaYaml;
  let valid = true;
  if (ide !== projectType.ide && !linter) {
    // We log a warning but allow it.
    core.warning(
      `qodana.yaml: '$.ide' does not match ${projectType.ide} and '$.linter' not found.`,
    );
  }

  if (critical > 0) {
    valid = false;
    core.error(
      `qodana.yaml: '$.failureConditions.severityThresholds.critical' can't be greater than 0`,
    );
  }

  if (total < 50) {
    valid = false;
    core.error(
      `qodana.yaml: '$.failureConditions.testCoverageThresholds.total' can't be less than 50`,
    );
  }

  if (fresh < 80) {
    valid = false;
    core.error(
      `qodana.yaml: '$.failureConditions.testCoverageThresholds.fresh' can't be less than 80`,
    );
  }

  return valid;
};

const qodanaSanity = (projectType, projectDirectory) => {
  const qodanaYaml = path.join(projectDirectory, 'qodana.yaml');
  let valid = true;
  if (!fs.existsSync(qodanaYaml)) {
    core.warning(
      `${qodanaYaml} does not exist. Default config will be generated.`,
    );
    defaultConfig(projectType, projectDirectory);
  } else {
    valid = validateConfig(projectType, projectDirectory);
  }
  return valid;
};

module.exports = qodanaSanity;
