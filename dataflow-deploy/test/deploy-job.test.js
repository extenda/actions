jest.mock('@actions/exec');
const exec = require('@actions/exec');
const deployJob = require('../src/deploy-job');

describe('deploy dataflow job', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('deploy flex-template job', async () => {
    deployJob(
      'job-name-10',
      'test=job-test',
      'dataflow-sa',
      'gs://dataflow-bucket/dataflow/templates/job-name/0.0.1/template.json',
      'europe-west1',
      'test-staging-323',
      'flex-template',
      'gs://dataflow-bucket/dataflow/templates/job-name/0.0.1/staging',
    );
    expect(exec.exec).toHaveBeenCalledTimes(1);
    expect(exec.exec).toHaveBeenCalledWith('gcloud', [
      'dataflow',
      'flex-template',
      'run',
      'job-name-10',
      '--template-file-gcs-location=gs://dataflow-bucket/dataflow/templates/job-name/0.0.1/template.json',
      '--parameters=test=job-test',
      '--staging-location=gs://dataflow-bucket/dataflow/templates/job-name/0.0.1/staging',
      '--service-account-email=dataflow-sa',
      '--region=europe-west1',
      '--project=test-staging-323',
    ]);
  });

  test('deploy flex-template job without parameters', async () => {
    deployJob(
      'job-name-10',
      '',
      'dataflow-sa',
      'gs://dataflow-bucket/dataflow/templates/job-name/0.0.1/template.json',
      'europe-west1',
      'test-staging-323',
      'flex-template',
      'gs://dataflow-bucket/dataflow/templates/job-name/0.0.1/staging',
    );
    expect(exec.exec).toHaveBeenCalledTimes(1);
    expect(exec.exec).toHaveBeenCalledWith('gcloud', [
      'dataflow',
      'flex-template',
      'run',
      'job-name-10',
      '--template-file-gcs-location=gs://dataflow-bucket/dataflow/templates/job-name/0.0.1/template.json',
      '--staging-location=gs://dataflow-bucket/dataflow/templates/job-name/0.0.1/staging',
      '--service-account-email=dataflow-sa',
      '--region=europe-west1',
      '--project=test-staging-323',
    ]);
  });

  test('deploy job', async () => {
    deployJob(
      'job-name-10',
      '',
      'dataflow-sa',
      'gs://dataflow-templates-europe-west1/latest/Word_Count',
      'europe-west1',
      'test-staging-323',
      'job',
    );
    expect(exec.exec).toHaveBeenCalledTimes(1);
    expect(exec.exec).toHaveBeenCalledWith('gcloud', [
      'dataflow',
      'job',
      'run',
      'job-name-10',
      '--gcs-location=gs://dataflow-templates-europe-west1/latest/Word_Count',
      '--service-account-email=dataflow-sa',
      '--region=europe-west1',
      '--project=test-staging-323',
    ]);
  });
});
