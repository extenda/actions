# dataflow-deploy

This is a GitHub Action to deploy dataflow jobs.

## Usage

See [action.yml](action.yml).

### Examples

```yaml
jobs:
  deploy-dataflow-job:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/master'
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
          job-version: ${{ steps.semver.outputs.short-sha }} # Used for job name seperation (will be appended to job name)
          template-path: gs://dataflow-templates-europe-west1/latest/Cloud_PubSub_to_Cloud_PubSub
          staging-location: gs://clan-templates/send-to-bigquery/${{ steps.semver.outputs.short-sha }}/
          region: europe-west1
```

If you want to use a more customized template you will need to use flex-template job-type
```yaml
jobs:
  deploy-dataflow-job:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/master'
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
          job-version: ${{ steps.semver.outputs.short-sha }} # Used for job name seperation (will be appended to job name)
          template-path: gs://dataflow-templates-europe-west1/latest/flex/Hive_to_BigQuery
          staging-location: gs://clan-templates/Hive_to_BigQuery/${{ steps.semver.outputs.short-sha }}/
          parameters: inputSubscription=hive-subscription,outputSubscription=bigquery-topic
          region: europe-west1
```
Use the action together with dataflow build action for customized image and template

```yaml

jobs:
  dataflow-template-build:
    runs-on: ubuntu-latest
    steps:
          
      - name: Determine version
        uses: extenda/actions/conventional-version@v0
        id: semver
        with:
          build-number: ${{ github.run_number }}

      - name: Authenticate docker
        run: |
          gcloud --quiet auth configure-docker

      - name: Docker build and push
        run: |
          docker build . -f Dockerfile -t eu.gcr.io/extenda/project-id/work-work:${{ github.sha }}
          docker push eu.gcr.io/extenda/project-id/work-work:${{ github.sha }}

      - uses: actions/checkout@v1
      - name: Dataflow template build
        uses: extenda/actions/dataflow-template-build@v0
        with:
          template-path: gs://clan-dataflow/templates/work-work/${{ steps.semver.outputs.version }}/template.json
          image: eu.gcr.io/extenda/project-id/work-work:${{ github.sha }} # Path to the image in the GCR with the tag
          sdk-language: JAVA # Can be JAVA or PYTHON
          metadata-path: metadata.json
          service-account-key: ${{ secrets.GCLOUD_AUTH_STAGING }} # Used to authenticate with gcloud

  deploy-dataflow-job:
    runs-on: ubuntu-latest
    needs: dataflow-template-build
    if: github.ref == 'refs/heads/master'
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
          job-name: work-work
          job-version: ${{ steps.semver.outputs.short-sha }} # Used for job name seperation (will be appended to job name)
          template-path: gs://clan-dataflow/templates/work-work/${{ steps.semver.outputs.version }}/template.json
          staging-location: gs://clan-templates/work-work/staging/${{ steps.semver.outputs.short-sha }}/
          parameters: inputSubscription=work-subscription
          region: europe-west1
```
