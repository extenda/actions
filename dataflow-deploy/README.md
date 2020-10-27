# dataflow-deploy

This is a GitHub Action to deploy dataflow jobs.

## Usage

See [action.yml](action.yml).

### Examples

```yaml
jobs:
  deploy-dataflow-job:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1

      - uses: extenda/actions/gcp-secret-manager@v0
        with:
          service-account-key: ${{ secrets.SECRET_AUTH }}
          secrets: |
            DATAFLOW_SERVICE_ACCOUNT: dataflow-worker

      - name: Determine version
        uses: extenda/actions/conventional-version@v0
        id: semver
        with:
          build-number: ${{ github.run_number }}

      - name: Dataflow deploy
        uses: extenda/actions/dataflow-deploy@v0
        with:
          bucket: bucket-name # your template will be stored under 'gs://bucket-name/dataflow/templates/send-to-bigquery/${{ steps.semver.outputs.version }}/';
          dataflow-service-account: ${{ env.DATAFLOW_SERVICE_ACCOUNT }}
          job-name: send-to-bigquery
          job-version: ${{ github.run_number }} # Used for job name seperation
          parameters: inputSubscription=input-subscription,outputTopic=output-topic
          region: europe-west1
          release-version: ${{ steps.semver.outputs.version }} # Used to version templates in bucket
          service-account-key: ${{ secrets.GCLOUD_AUTH_STAGING }} # Used to authenticate with gcloud
```
