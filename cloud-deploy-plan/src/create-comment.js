const appendJson = (deployInfo) => [
  '',
  '<details>',
  `<summary>Raw response</summary>`,
  '',
  '```json',
  JSON.stringify(deployInfo, null, 2),
  '```',
  '',
  '</details>',
  '',
];

const markdownList = (list) => list.map((e) => `  * ${e}`).join('\n');

const markdownRoute = (route) =>
  `Target ${route.target} on paths ${route.paths.map((p) => `\`${p}\``).join(', ')} with rewrite \`${route.rewrite || ''}\``;

const markdownMigration = (migration) =>
  `Migrate \`${migration.host}\` from ${migration.service} in ${migration.projectid}`;

const markdownVulnerability = (vulnerability) => {
  const { vulnerabilityid: id, severity } = vulnerability;
  const emoji =
    severity === 'CRITICAL' ? ':bangbang:' : ':heavy_exclamation_mark:';
  return `${emoji} [${id}](https://www.cve.org/CVERecord?id=${id})`;
};

const createComment = (filename, deployInfo) => {
  const comment = [`#### ${filename}`, ''];

  const serviceName = `\`${deployInfo.serviceName}\``;

  if (deployInfo.updates === false) {
    comment.push(`No changes to ${serviceName}.`, ...appendJson(deployInfo));
  } else {
    if (deployInfo.updates.new) {
      comment.push(`${serviceName} is **new**.`);
    } else {
      comment.push(`${serviceName} has changes!`);
    }
    comment.push(...appendJson(deployInfo));

    comment.push('| JSON property | New value |');
    comment.push('|---|---|');
    Object.keys(deployInfo.updates)
      .filter((key) => !key.endsWith('Mappings'))
      .forEach((key) => comment.push(`${key} | ${deployInfo.updates[key]} |`));

    const domains = deployInfo.updates.domainMappings || {};
    if (domains.added) {
      comment.push('', '**Added domains**', markdownList(domains.added));
    }
    if (domains.removed) {
      comment.push(
        '',
        '**:warning: Removed domains**',
        markdownList(domains.removed),
      );
    }
    if (domains.migrations) {
      comment.push(
        '',
        '**:warning: Migrations**',
        markdownList(domains.migrations).map(markdownMigration),
      );
    }

    const paths = deployInfo.updates.pathMappings || {};
    const addedRoutes = paths.newRoutes || paths.updatedRoutes;
    if (addedRoutes) {
      comment.push(
        '',
        '** Added routes **',
        markdownList(addedRoutes.map(markdownRoute)),
      );
    }
    if (paths.removedRoutes) {
      comment.push(
        '',
        '**:warning: Removed routes **',
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
