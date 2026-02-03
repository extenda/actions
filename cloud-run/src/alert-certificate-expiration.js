import exec from '@actions/exec';

import notifySlack from '../../slack-notify/src/slack-notify';

const alertOnExpiration = async (
  expirationDate,
  serviceAccount,
  clusterProject,
) => {
  if (
    (expirationDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24) <
    29
  ) {
    const text = `Certificates in cluster on project ${clusterProject} about to expire!`;
    const channel = '#gcp-platform-alert';
    await notifySlack(serviceAccount, text, channel, '');
  }
};

const certificateExpiration = async (serviceAccount, clusterProject) => {
  let output = '';
  await exec.exec(
    'kubectl',
    ['get', 'order.tls', '--all-namespaces', '-o', 'json'],
    {
      silent: true,
      listeners: {
        stdout: (data) => {
          output += data.toString('utf8');
        },
      },
    },
  );
  const orders = JSON.parse(output).items;
  const promises = [];
  for (let i = 0; i < orders.length; i += 1) {
    try {
      const expiration = new Date(orders[i].status.certificate.expires);
      promises.push(
        alertOnExpiration(expiration, serviceAccount, clusterProject),
      );
    } catch {
      // We only want to make sure certificates get renewed.
    }
  }
  return Promise.all(promises);
};

module.exports = certificateExpiration;
