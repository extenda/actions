const { writeFile } = require('fs').promises;
const { join } = require('path');

/**
 * @param {{
 *   credentials: {
 *     username: string,
 *     password: string,
 *   },
 *   outputDir: string,
 * }}
 */
const createNpmrcFile = async ({ credentials: { username, password }, outputDir }) => {
  const nexusToken = Buffer.from(`${username}:${password}`).toString('base64');
  const contents = `
@hiiretail:registry = https://repo.extendaretail.com/repository/npm-group/
//repo.extendaretail.com/repository/npm-group/:email = nexus@extenda.com
//repo.extendaretail.com/repository/npm-group/:always-auth = true
//repo.extendaretail.com/repository/npm-group/:_auth = ${nexusToken}
`;
  await writeFile(join(outputDir, '.npmrc'), contents);
};

module.exports = { createNpmrcFile };
