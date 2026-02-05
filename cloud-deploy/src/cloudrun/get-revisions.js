import execGcloud from '../utils/gcloud-output.js';

const isActive = (conditions) => {
  const activeStatus = conditions.find(
    (c) => c.type === 'Active' && c.status === 'True',
  );
  return activeStatus !== undefined;
};

const getRevisions = async (service, project, region) => {
  const output = await execGcloud(
    [
      'run',
      'revisions',
      'list',
      `--service=${service}`,
      `--project=${project}`,
      `--region=${region}`,
      '--format=json',
    ],
    'gcloud',
    true,
    true,
  );

  // Return a sorted array of revisions with newest to oldest.
  return JSON.parse(output.trim())
    .map((rev) => ({
      name: rev.metadata.name,
      creationTimestamp: rev.metadata.creationTimestamp,
      active: isActive(rev.status.conditions),
    }))
    .sort(
      (a, b) =>
        Date.parse(b.creationTimestamp) - Date.parse(a.creationTimestamp),
    );
};

export default getRevisions;
