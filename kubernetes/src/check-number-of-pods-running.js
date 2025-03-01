const exec = require('@actions/exec');

/**
 * Simple timer to wait for a specified amount of time.
 * @param ms Number of milliseconds to wait
 */
const timer = (ms) =>
  new Promise((res) => {
    setTimeout(res, ms);
  });

/**
Verifies that the number of pods running for deployment is equal to the expected number of replicas.
*/
const checkRequiredNumberOfPodsIsRunning = async (
  deploymentName,
  numberOfReplicasToBeRunning,
  retryMs,
  dryRun,
) => {
  // This for now will only run if the dryRun is provided for development and testing purposes.
  if (dryRun) {
    // Form arguments to set current namespace for kubectl commands
    const setCurrentNamespaceArgs = [
      'config',
      'set-context',
      '--current',
      `--namespace=${deploymentName}`,
    ];

    await exec.exec('kubectl', setCurrentNamespaceArgs);

    // Form additional argument for the kubectl command.
    // Arguments to return number of pods that have status Running.
    const getRunningPodsArgs = [
      'get',
      'pods',
      '--field-selector=status.phase=Running',
      '--no-headers=true',
      '| wc -l',
    ];

    // Arguments to return number of pods
    // that have status NOT Running which can be: Pending, Succeeded, Failed, Unknown.
    const getNonRunningPodsArgs = [
      'get',
      'pods',
      '--field-selector=status.phase!=Running',
      '--no-headers=true',
      '| wc -l',
    ];

    for (let i = 0; i < 3; i += 1) {
      let podsInRunningState = 0;
      try {
        // Execute kubectl with args and rout output to variable.

        await exec.exec('kubectl', getRunningPodsArgs, {
          listeners: {
            stdout: (data) => {
              podsInRunningState += parseInt(data.toString('utf8').trim(), 10);
            },
          },
        });
      } catch {
        // Ignored
      }

      let podsNotInRunningState = 0;
      try {
        // Execute kubectl with args and rout output to variable.

        await exec.exec('kubectl', getNonRunningPodsArgs, {
          listeners: {
            stdout: (data) => {
              podsNotInRunningState += parseInt(
                data.toString('utf8').trim(),
                10,
              );
            },
          },
        });
      } catch {
        // Ignored
      }

      // Check the number of pods in running state to be equal to expected number of replicas.
      if (
        podsInRunningState === numberOfReplicasToBeRunning &&
        (podsNotInRunningState === 0 ||
          Number.isNaN(Number(podsNotInRunningState)))
      ) {
        return;
      }

      await timer(retryMs); // Tries again after X milliseconds
    }

    // Test code area

    // kubectl get pods -n pnp-price-spec-ks --no-headers=true -o json
    // | jq -r '.items[].status.phase' | grep -o 'Running' -c
    const getRunningPodsNoSelectorArgs = [
      'get',
      'pods',
      `--namespace=${deploymentName}`,
      '--no-headers=true',
      "-o json | jq -r '.items[].status.phase' | grep -o 'Running' -c ",
    ];

    await exec.exec('kubectl', getRunningPodsNoSelectorArgs, {
      listeners: {
        stdout: (data) => {
          console.log(parseInt(data.toString('utf8').trim(), 10));
        },
      },
    });

    // kubectl config view
    const configViewArgs = ['config', 'view'];
    await exec.exec('kubectl', configViewArgs, {
      listeners: {
        stdout: (data) => {
          console.log(data.toString('utf8'));
        },
      },
    });
    // Test code area ended

    throw new Error(
      `Deployment failed. Number of running pods is lower then expected replica count after ${retryMs * 3} milliseconds.`,
    );
  }
};

module.exports = checkRequiredNumberOfPodsIsRunning;
