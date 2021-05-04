const gcloudOutput = require("./gcloud-output")

const parseStatus = async (statuses) => {
  for (const status of statuses) {
    if (status.status !== 'True') {
      return false;
    }
  }
}

const checkStatus = async (namespace) => {
  const serviceList = JSON.parse(await gcloudOutput([
    'get',
    'po',
    '-n',
    namespace,
    '-o',
    'json'
  ], 'kubectl')).items;

  // console.log(serviceList);

  for (const service of serviceList) {

    const podName = service.spec.hostname;
    const status = await parseStatus(service.status.conditions);

    console.log(podName);
    console.log(status);

  }

}

checkStatus('testrunner-txengine');