const execGcloud = require('./gcloud-output');

const matchName = (connectorName, nameConvention) =>
  connectorName === nameConvention;

const listVpcConnectors = async (project, region) =>
  JSON.parse(
    await execGcloud([
      'compute',
      'networks',
      'vpc-access',
      'connectors',
      'list',
      `--region=${region}`,
      `--project=${project}`,
      '--format=json',
    ]),
  );

const checkVpcConnector = async (project, region, name) => {
  const vpcConnectors = await listVpcConnectors(project, region);
  for (const connector of vpcConnectors) {
    const { network } = connector;
    const connectorName = connector.name.split('/').pop();

    const connectorMatch = matchName(connectorName, name);
    if (connectorMatch || network === 'clan-network') {
      return connectorName;
    }
  }
  throw new Error(`No connector found for this project ${project}`);
};

module.exports = checkVpcConnector;
