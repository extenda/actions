const appendJson = (filename, deployInfo) => [
  '',
  '<details>',
  `<summary><b>:page_facing_up: ${filename}</b></summary>`,
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

const markdownRoute = (route) =>
  `target \`${route.target}\` on paths ${route.paths.map((p) => `\`${p}\``).join(', ')} with rewrite \`${route.rewrite || ''}\``;

const markdownMigration = (migration) =>
  `Migrate \`${migration.host}\` from ${migration.service} in ${migration.projectid}`;

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
        .map((d) => `:orange_circle: ${d}`),
    );
  }
  if (entries.length > 0) {
    return ['**Changes to domain mappings**', markdownList(entries)];
  }
  return [];
};

const paths = (paths) => {
  const entries = [];
  if (arrayNotEmpty(paths.newRoutes)) {
    entries.push(
      ...paths.newRoutes
        .map(markdownRoute)
        .map((p) => `:green_circle: Add ${p}`),
    );
  }
  if (arrayNotEmpty(paths.updatedRoutes)) {
    entries.push(
      ...paths.updatedRoutes
        .map(markdownRoute)
        .map((p) => `:orange_circle: Update ${p}`),
    );
  }
  if (arrayNotEmpty(paths.deletedRoutes)) {
    entries.push(
      ...paths.deletedRoutes
        .map(markdownRoute)
        .map((p) => `:red_circle: Remove ${p}`),
    );
  }
  if (entries.length > 0) {
    return ['**Changes to path mappings**', markdownList(entries)];
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
        comment.push('| JSON property | New value |');
        comment.push('|---|---|');
        changes.forEach((key) =>
          comment.push(`${key} | ${deployInfo.updates[key]} |`),
        );
      }
    }

    comment.push(...domains(deployInfo.updates.domainMappings || {}));
    comment.push(...paths(deployInfo.updates.pathMappings || {}));
  }

  if (deployInfo.vulnerabilities !== false) {
    comment.push(
      '',
      '**Vulnerabilities in production**',
      markdownList(deployInfo.vulnerabilities.map(markdownVulnerability)),
    );
  }

  return comment.join('\n');
};
module.exports = createComment;
