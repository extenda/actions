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
          service-account-key: ${{ secrets.GCLOUD_AUTH_STAGING }} # Used to authenticate with gcloud
          dataflow-service-account: ${{ env.DATAFLOW_SERVICE_ACCOUNT }}
          job-type: job
          job-name: send-to-bigquery
          job-version: ${{ github.run_number }} # Used for job name seperation (will be appended to job name)
          template-path: gs://dataflow-templates-europe-west1/latest/Cloud_PubSub_to_Cloud_PubSub
          staging-location: gs://clan-templates/send-to-bigquery/${{ github.run_number }}/
          region: europe-west1
```

If you want to use a more customized template you will need to use flex-template job-type
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
          service-account-key: ${{ secrets.GCLOUD_AUTH_STAGING }} # Used to authenticate with gcloud
          dataflow-service-account: ${{ env.DATAFLOW_SERVICE_ACCOUNT }}
          job-type: flex-template
          job-name: hive-to-bigquery
          job-version: ${{ github.run_number }} # Used for job name seperation (will be appended to job name)
          template-path: gs://dataflow-templates-europe-west1/latest/flex/Hive_to_BigQuery
          staging-location: gs://clan-templates/Hive_to_BigQuery/${{ github.run_number }}/
          parameters: inputSubscription=hive-subscription,outputSubscription=bigquery-topic
          region: europe-west1
```
