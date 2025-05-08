const core = require('@actions/core');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { GENERATED_QODANA_YAML } = require('./constants');

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

  const generatedFile = path.resolve(
    projectDirectory,
    'qodana_recommended.yaml',
  );
  fs.writeFileSync(generatedFile, yaml.dump(qodanaYaml, 'utf-8'), 'utf-8');
  return generatedFile;
};

const validateConfig = (projectType, qodanaFile) => {
  const qodanaYaml = yaml.load(fs.readFileSync(qodanaFile, 'utf-8'));
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
  let qodanaYaml = path.resolve(projectDirectory, 'qodana.yaml');
  if (fs.existsSync(qodanaYaml)) {
    // We copy the existing file to ensure it be found even if added in this current branch.
    // Qodana seem to move around in the git history and can lose the file otherwise.
    const qodanaCopy = path.resolve(projectDirectory, 'qodana_provided.yaml');
    fs.copyFileSync(qodanaYaml, qodanaCopy);
    qodanaYaml = qodanaCopy;
  } else {
    core.warning(
      `${path.relative(process.cwd(), qodanaYaml)} does not exist. Recommended config will be generated.`,
    );
    qodanaYaml = defaultConfig(projectType, projectDirectory);
    core.saveState(GENERATED_QODANA_YAML, qodanaYaml);
    core.info(`Generated ${qodanaYaml}`);
  }
  return {
    qodanaYamlFile: qodanaYaml,
    valid: validateConfig(projectType, qodanaYaml),
  };
};

module.exports = qodanaSanity;
