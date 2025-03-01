const gcloudOutput = require('../utils/gcloud-output');

const handleStatefulset = async (name, volumeSize) => {
  // 2. Fetch currently deployed statefulset
  const statefulset = JSON.parse(
    await gcloudOutput(
      ['get', 'sts', `--namespace=${name}`, '--output=json'],
      'kubectl',
      true,
    ),
  );

  if (!statefulset.items[0]) {
    // Not an existing stateful set.
    return [];
  }

  // 3. Compare new volume size with currently deployed
  const statefulsetSpecs = statefulset.items[0].spec;
  let statefulsetVolumeSize = 0;
  if (statefulsetSpecs.volumeClaimTemplates) {
    const volumeClaimTemplates = statefulsetSpecs.volumeClaimTemplates[0];
    statefulsetVolumeSize =
      volumeClaimTemplates.spec.resources.requests.storage;
  }
  const promises = [];
  if (statefulsetVolumeSize !== volumeSize) {
    // 4. if different update all pvcs
    const persistantVolumeClaims = JSON.parse(
      await gcloudOutput(
        ['get', 'pvc', `--namespace=${name}`, '--output=json'],
        'kubectl',
        true,
      ),
    );
    for (const pvc of persistantVolumeClaims.items) {
      const pvcName = pvc.metadata.name;
      promises.push(
        gcloudOutput(
          [
            'patch',
            'pvc',
            pvcName,
            `--namespace=${name}`,
            `--patch={"spec":{"resources":{"requests":{"storage":"${volumeSize}"}}}}`,
          ],
          'kubectl',
          false,
        ),
      );
    }
    await Promise.all(promises);
    // 5. remove sts with kubectl delete sts (name) -n (namespace) --cascade=orphan
    promises.push(
      gcloudOutput(
        ['delete', 'sts', name, `--namespace=${name}`, '--cascade=orphan'],
        'kubectl',
      ),
    );
  }
  return promises;
};

module.exports = handleStatefulset;
