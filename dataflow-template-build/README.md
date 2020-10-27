# dataflow-template-build

This is a GitHub Action to build Dataflow flex templates.

## Usage

See [action.yml](action.yml).

### Examples

```yaml
jobs:
  dataflow-template-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1
      - name: Dataflow template build
        uses: extenda/actions/dataflow-template-build@v0
        with:
          template-path: buket-name # The template will be stored under 'gs://bucket-name/dataflow/templates/pubsub-to-pubsub/${{ steps.semver.outputs.version }}/'
          image: my-image # Path to the image in the GCR with the tag `eu.gcr.io/extenda/project-id/image:${{ steps.semver.outputs.version }}'
          sdk-language: JAVA # Can be JAVA or PYTHON
          metadata-path: metadata.json
          service-account-key: ${{ secrets.GCLOUD_AUTH_STAGING }} # Used to authenticate with gcloud
```
