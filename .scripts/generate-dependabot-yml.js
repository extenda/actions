const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { modules } = require('./modules');

const generateDependabot = () => {
  const actions = modules.list()
    .map((dir) => '/' + path.relative(path.join(__dirname, '..'), dir))
    .map((directory) => ({
      'package-ecosystem': 'npm',
      directory,
      schedule: {
        interval: 'weekly',
      },
      groups: {
        actions: {
          patterns: ['*'],
        },
      },
    }));

  const dependabot = {
    version: 2,
    updates: [
      ... actions,
      {
        'package-ecosystem': 'github-actions',
        directory: '/',
        schedule: {
          interval: 'weekly',
        },
        groups: {
          workflows: {
            patterns: ['*'],
          },
        },
      },
    ],
  };
  fs.writeFileSync(
    path.join(__dirname, '..', '.github', 'dependabot.yml'),
    `# Generated by .scripts/generate-dependabot.yml on 'npm run build'
# DO NOT EDIT THIS FILE

${yaml.dump(dependabot).toString('utf8')}`,
    'utf-8',
  );
};

module.exports = generateDependabot;