const appendJson = (filename, deployInfo) => [
  '',
  '<details>',
  `<summary><h3>:page_facing_up: ${filename}</h3></summary>`,
  '',
  '```json',
  JSON.stringify(deployInfo, null, 2),
  '```',
  '',
  '</details>',
  '',
];

const arrayNotEmpty = (array) => Array.isArray(array) && array.length > 0;

const markdownList = (list) => list.map((e) => `  * ${e}`).join('\n');

const markdownRoute = (route) => {
  const paths = route.paths.map((p) => `    - \`${p}\``).join('\n');
  const rewrite = `\`${route.rewrite || ''}\``;
  return `target \`${route.target}\` with rewrite ${rewrite} on paths:\n${paths}`;
};

const markdownMigration = (migration) =>
  `\`${migration.host}\` from service \`${migration.service}\` in project \`${migration.projectid}\``;

const markdownVulnerability = (vulnerability) => {
  const { vulnerabilityid: id, severity } = vulnerability;
  const emoji =
    severity === 'CRITICAL' ? ':bangbang:' : ':heavy_exclamation_mark:';
  return `${emoji} [${id}](https://www.cve.org/CVERecord?id=${id})`;
};

const domains = (domains) => {
  const entries = [];
  if (arrayNotEmpty(domains.added)) {
    entries.push(...domains.added.map((d) => `:green_circle: Add \`${d}\``));
  }
  if (arrayNotEmpty(domains.removed)) {
    entries.push(...domains.removed.map((d) => `:red_circle: Remove \`${d}\``));
  }
  if (arrayNotEmpty(domains.migrations)) {
    entries.push(
      ...domains.migrations
        .map(markdownMigration)
        .map((d) => `:orange_circle: Migrate ${d}`),
    );
  }
  if (entries.length > 0) {
    return ['**Changes to domain mappings**', markdownList(entries), ''];
  }
  return [];
};

const paths = (paths) => {
  const entries = [];
  if (arrayNotEmpty(paths.added)) {
    entries.push(
      ...paths.added.map(markdownRoute).map((p) => `:green_circle: Add ${p}`),
    );
  }
  if (arrayNotEmpty(paths.removed)) {
    entries.push(
      ...paths.removed
        .map(markdownRoute)
        .map((p) => `:red_circle: Remove ${p}`),
    );
  }
  if (arrayNotEmpty(paths.updated)) {
    entries.push(
      ...paths.updated
        .map(markdownRoute)
        .map((p) => `:orange_circle: Update ${p}`),
    );
  }
  if (entries.length > 0) {
    return ['**Changes to path mappings**', markdownList(entries), ''];
  }
  return [];
};

const createComment = (filename, deployInfo) => {
  const comment = [...appendJson(filename, deployInfo)];
  const serviceName = `\`${deployInfo.serviceName}\``;

  if (deployInfo.updates === false) {
    comment.push(`No changes to ${serviceName}.`);
  } else {
    if (deployInfo.updates.new) {
      comment.push(`${serviceName} is **new**.`);
    } else {
      comment.push(`${serviceName} has changes!`, '');

      const changes = Object.keys(deployInfo.updates).filter(
        (key) => !key.endsWith('Mappings'),
      );
      if (arrayNotEmpty(changes)) {
        comment.push('| JSON property | New value | Current value |');
        comment.push('|---|---|---|');
        changes.forEach((key) => {
          const value = deployInfo.updates[key];
          let newValue = value;
          let currentValue = '-';
          if (Array.isArray(value)) {
            [newValue, currentValue] = value;
          }
          comment.push(`${key} | ${newValue} | ${currentValue} |`);
        });
        comment.push('');
      }
    }

    comment.push(...domains(deployInfo.updates.domainMappings || {}));
    comment.push(...paths(deployInfo.updates.pathMappings || {}));
  }

  if (
    Array.isArray(deployInfo.vulnerabilities) &&
    deployInfo.vulnerabilities.length > 0
  ) {
    comment.push(
      '',
      '**Vulnerabilities in production**',
      markdownList(deployInfo.vulnerabilities.map(markdownVulnerability)),
    );
  }

  comment.push('');
  if (deployInfo.serveTraffic) {
    comment.push('> [!CAUTION]');
    comment.push('> Traffic will be served immediately to a new deployment.');
  } else {
    comment.push('> [!NOTE]');
    comment.push(
      '> Canary deployment is used for the new deployment. 0% traffic will be served initially. Use the [Operations Hub](https://operations.retailsvc.com/ui/platform/service-manager) to gradually shift traffic.',
    );
  }
  comment.push('');

  return comment.join('\n');
};
module.exports = createComment;
