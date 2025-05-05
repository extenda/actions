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
  `Target \`${route.target}\` on paths ${route.paths.map((p) => `\`${p}\``).join(', ')} with rewrite \`${route.rewrite || ''}\``;

const markdownMigration = (migration) =>
  `Migrate \`${migration.host}\` from ${migration.service} in ${migration.projectid}`;

const markdownVulnerability = (vulnerability) => {
  const { vulnerabilityid: id, severity } = vulnerability;
  const emoji =
    severity === 'CRITICAL' ? ':bangbang:' : ':heavy_exclamation_mark:';
  return `${emoji} [${id}](https://www.cve.org/CVERecord?id=${id})`;
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

    const domains = deployInfo.updates.domainMappings || {};
    if (arrayNotEmpty(domains.added)) {
      comment.push('', '**Added domains**', markdownList(domains.added));
    }
    if (arrayNotEmpty(domains.removed)) {
      comment.push(
        '',
        '**:warning: Removed domains**',
        markdownList(domains.removed),
      );
    }
    if (arrayNotEmpty(domains.migrations)) {
      comment.push(
        '',
        '**:warning: Migrations**',
        markdownList(domains.migrations.map(markdownMigration)),
      );
    }

    const paths = deployInfo.updates.pathMappings || {};
    const addedRoutes = paths.newRoutes || paths.updatedRoutes || [];
    if (arrayNotEmpty(addedRoutes)) {
      comment.push(
        '',
        '**Added routes**',
        markdownList(addedRoutes.map(markdownRoute)),
      );
    }
    if (arrayNotEmpty(paths.removedRoutes)) {
      comment.push(
        '',
        '**:warning: Removed routes**',
        markdownList(paths.removedRoutes.map(markdownRoute)),
      );
    }
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
