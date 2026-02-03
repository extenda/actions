import getRevisions from './get-revisions.js';

const getLatestRevision = async (
  namespace,
  { cluster, clusterLocation, project },
) =>
  getRevisions(namespace, project, cluster, clusterLocation).then(
    (revisions) => {
      if (!revisions) {
        throw new Error('No revisions');
      }
      return revisions[0].name; // First revision is the latest.
    },
  );

export default getLatestRevision;
