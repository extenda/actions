# iam

This is a GitHub Action to publish permissions and roles to Hii Retail IAM.

## Usage

See [action.yml](action.yml).

### Secrets

This action requires a GCP service account key with permission to deploy the cloud run services.
Once created, the JSON key should be `base64` encoded and added as secret in the GitHub repository.

### Examples

```yaml
jobs:
  prod:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1

      - name: IAM permissions
        uses: extenda/actions/iam@v0
        with:
          service-account-key: ${{ secrets.SECRET_AUTH }} # Used to fetch required credentials from secrets (required)
          service-account-key-staging: ${{ secrets.GCLOUD_AUTH_STAGING }} # Used to configure and create DAS-system on the correct cluster/environment (required)
          service-account-key-prod: ${{ secrets.GCLOUD_AUTH_PROD }} # Used to configure and create DAS-system on the correct cluster/environment (required)
          iam-definition: iam/*.yaml # default will match iam/*.yaml
          styra-url: https://extendaretail.svc.styra.com # default https://extendaretail.svc.styra.com 
```

## IAM YAML

The iam definition should be specified in a YAML file that is later used by this action. This allows us to handle
permissions and roles for this service.

By default, the action will load all YAML files matching the `iam/*.yaml` glob pattern. Each found file represents a
will be processed independent of others.

### Schema

The YAML syntax is formally defined with [JSON Schema](src/iam-schema.js). The following table explains what
properties are required and not.

| Property                   | Description                                                                                                                                                       | Required | Default Value |
|:---------------------------|:------------------------------------------------------------------------------------------------------------------------------------------------------------------|:---------|:--------------|
| `system.id`                     | The permission prefix and DAS system name                                                                                                                                                 | Yes      |               |
| `system.description`                   | The description of the service                                                                                                      | Yes      |               |
| `permissions`                      | An object containing the permissions for this service.                             | Yes      |               |
| `roles`              | An list of roles that should exist for this service                                        | No       |         |
| `roles.name`            | The role name                                                          | No       |          |
| `roles.description` | The description of the role, (max 20 characters)       | No             |
| `roles.permissions`             | An list of permissions this role should contain                                                                                 | No       |       |

### YAML Examples

#### Create permissions and roles

This example defines a YAML file that creates roles and permissions for the DAS system `iam`
```yaml
permission-prefix: iam
systems:
  - namespace: iam-api
    repository: hiiretail-iam-api
  - namespace: iam-ui
    repository: hiiretail-iam-ui
permissions:
  tenants:
    create: Create tenants
    get: Get tenants
    update: Update Tenants
    delete: Delete Tenants
    special: Super user access
roles:
  - name: admin
    desc: IAM admin
    permissions:
      - tenants.create
      - tenants.get
      - tenants.update
      - tenants.delete
      - tenants.special
  - name: readonly
    desc: IAM readonly
    permissions:
      - tenants.get

```
