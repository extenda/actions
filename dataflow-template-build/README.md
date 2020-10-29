# dataflow-template-build

This is a GitHub Action to build Dataflow flex templates.

## Usage

See [action.yml](action.yml).

### Examples

#### Basic Usage

```yaml
jobs:
  dataflow-template-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1
      - name: Dataflow template build
        uses: extenda/actions/dataflow-template-build@v0
        with:
          template-path: gs://bucket-name/dataflow/templates/pubsub-to-pubsub/${{ steps.semver.outputs.version }}/template.json
          image: eu.gcr.io/extenda/project-id/image:${{ steps.semver.outputs.version }}
          sdk-language: JAVA # Can be JAVA or PYTHON
          service-account-key: ${{ secrets.GCLOUD_AUTH_STAGING }} # Used to authenticate with gcloud
```

The following example builds the flex Dataflow template into a staging project.


You can add an optional metadata flag that is a local path to the metadata json file for the flex template.

```yaml
jobs:
  dataflow-template-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1
      - name: Dataflow template build
        uses: extenda/actions/dataflow-template-build@v0
        with:
          template-path: gs://bucket-name/dataflow/templates/pubsub-to-pubsub/${{ steps.semver.outputs.version }}/template.json
          image: eu.gcr.io/extenda/project-id/image:${{ steps.semver.outputs.version }}
          sdk-language: JAVA # Can be JAVA or PYTHON
          service-account-key: ${{ secrets.GCLOUD_AUTH_STAGING }} # Used to authenticate with gcloud
          metadata-path: metadata.json
```
