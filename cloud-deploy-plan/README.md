# cloud-deploy-plan

This action is capable of showing a plan with changes for a [`cloud-deploy`](../cloud-deploy) service.
The plan will be presented as a pull request comment. The plan will only include changes critical enough
to be tracked by the Extenda Platform API.

## Usage

See [action.yml](action.yml).

### Secrets

This action requires a GCP service account key with permission to deploy the cloud run services.
Once created, the JSON key should be `base64` encoded and added as secret in the GitHub repository.

### Examples

The recommended use is to define a `pull_request` workflow that runs a plan.

```yaml
name: Cloud Deploy Plan
on: pull_request

jobs:
  plan-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: extenda/actions/cloud-deploy-plan@v0
        with:
          service-account-key: ${{ secrets.GCLOUD_AUTH_PROD }}
```

If you use multiple cloud deploy YAML files, they can be separated by new lines.

```yaml
name: Cloud Deploy Plan
on: pull_request

jobs:
  plan-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: extenda/actions/cloud-deploy-plan@v0
        with:
          service-account-key: ${{ secrets.GCLOUD_AUTH_PROD }}
          service-definition: |
            services/service-1/cloud-deploy.yaml
            services/service-2/cloud-deploy.yaml
```
