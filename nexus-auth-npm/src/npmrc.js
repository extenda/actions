const { writeFile } = require('fs').promises;
const { join } = require('path');

/**
 * @param {{
 *   credentials: {
 *     username: string,
 *     password: string,
 *   },
 *   outputDir: string,
 *   authForPublishing?: boolean,
 * }}
 */
const createNpmrcFile = async ({
  credentials:
  { username, password },
  authForPublishing,
  outputDir,
}) => {
  const nexusToken = Buffer.from(`${username}:${password}`).toString('base64');
  const repo = authForPublishing ? 'npm-private' : 'npm-group';
  const contents = `
@hiiretail:registry = https://repo.extendaretail.com/repository/${repo}/
//repo.extendaretail.com/repository/npm-group/:email = nexus@extenda.com
//repo.extendaretail.com/repository/npm-group/:always-auth = true
//repo.extendaretail.com/repository/npm-group/:_auth = ${nexusToken}
`;
  await writeFile(join(outputDir, '.npmrc'), contents);
};

module.exports = { createNpmrcFile };
