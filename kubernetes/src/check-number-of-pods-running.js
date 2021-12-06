const exec = require('@actions/exec');

/**
 * Simple timer to wait for a specified amount of time.
 * @param ms Number of milliseconds to wait
 */
const timer = (ms) => new Promise((res) => setTimeout(res, ms));

/**
Verifies that the number of pods running for deployment is equal to the expected number of replicas.
*/
const checkRequiredNumberOfPodsIsRunning = async (
  deploymentName,
  numberOfReplicasToBeRunning,
  retryMs,
) => {
  // Form additional argument for the kubectl command.
  // Arguments to return number of pods that have status Running.
  const getRunningPodsArgs = [
    'get',
    'pods',
    '--field-selector=status.phase=Running',
    `--namespace=${deploymentName}`,
    '--no-headers=true',
    '| wc -l',
  ];

  // Arguments to return number of pods
  // that have status NOT Running which can be: Pending, Succeeded, Failed, Unknown.
  const getNonRunningPodsArgs = [
    'get',
    'pods',
    '--field-selector=status.phase!=Running',
    `--namespace=${deploymentName}`,
    '--no-headers=true',
    '| wc -l',
  ];

  for (let i = 0; i < 3; i += 1) {
    let podsInRunningState = 0;
    try {
      // Execute kubectl with args and rout output to variable.
      /* eslint-disable no-await-in-loop */
      await exec.exec('kubectl', getRunningPodsArgs, {
        listeners: {
          stdout: (data) => {
            podsInRunningState += parseInt(data.toString('utf8').trim(), 10);
          },
        },
      });
      /* eslint-enable no-await-in-loop */
    } catch (err) {
      // Ignored
    }

    let podsNotInRunningState = 0;
    try {
      // Execute kubectl with args and rout output to variable.
      /* eslint-disable no-await-in-loop */
      await exec.exec('kubectl', getNonRunningPodsArgs, {
        listeners: {
          stdout: (data) => {
            podsNotInRunningState += parseInt(data.toString('utf8').trim(), 10);
          },
        },
      });
      /* eslint-enable no-await-in-loop */
    } catch (err) {
      // Ignored
    }

    // Check the number of pods in running state to be equal to expected number of replicas.
    if (podsInRunningState === numberOfReplicasToBeRunning 
      && (podsNotInRunningState === 0 || isNaN(podsNotInRunningState))) {
      return;
    }
    /* eslint-disable no-await-in-loop */
    await timer(retryMs); // Tries again after X milliseconds
    /* eslint-enable no-await-in-loop */
  }
  throw new Error(
    `Deployment failed. Number of running pods is lower then expected replica count after ${retryMs * 3} milliseconds.`,
  );
};

module.exports = checkRequiredNumberOfPodsIsRunning;
