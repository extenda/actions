
/**
 * Remove the random numbers from a clan project. If we start with clan-prod-123
 * this returns clan-prod-404.
 */
const projectWithoutNumbers = (projectID, env) => {
  const clan = projectID.split(`-${env}`)[0];
  return `${clan}-${env}`;
};

module.exports = { projectWithoutNumbers };
