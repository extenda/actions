const exec = require('@actions/exec');
const SlackInit = require('slack-notify');
const { loadSecret } = require('../../gcp-secret-manager/src/secrets');

const alertOnExpiration = async (expirationDate, slack, clusterProject) => {
  if ((expirationDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24) < 29) {
    slack.send({
      channel: '#gcp-platform-alert',
      text: `Certificates in cluster on project ${clusterProject} about to expire!`,
      username: 'GHA platform bot',
    });
  }
};


const certificateExpiration = async (pipelineSecretSA, clusterProject) => {
  const slack = SlackInit(loadSecret(pipelineSecretSA, 'slack-webhook-gcp-platform'));
  let output = '';
  await exec.exec('kubectl', [
    'get',
    'order.tls',
    '--all-namespaces',
    '-o',
    'json',
  ], {
    silent: true,
    listeners: {
      stdout: (data) => {
        output += data.toString('utf8');
      },
    },
  });
  const orders = JSON.parse(output).items;
  const promises = [];
  for (let i = 0; i < orders.length; i += 1) {
    try {
      const expiration = new Date(orders[i].status.certificate.expires);
      promises.push(alertOnExpiration(expiration, slack, clusterProject));
    } catch (error) {
      // We only want to make sure certificates get renewed.
    }
  }
  return Promise.all(promises);
};

module.exports = certificateExpiration;
