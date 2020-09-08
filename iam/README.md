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
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1

      - name: IAM permissions
        uses: extenda/actions/iam@v0
        with:
          service-account-key: ${{ secrets.SECRET_AUTH }} # Used to fetch required credentials from secrets (required)
          service-account-key-cluster: ${{ secrets.GCLOUD_AUTH_STAGING }} # Used to configure and create DAS-system on the correct cluster/environment (required)
          iam-definition: iam.yaml # default iam.yaml
          styra-tenant: extendaretail # default extendaretail
          iam-api-url: https://iam-api.retailsvc.dev # default https://iam-api.retailsvc. (dev for staging, com for prod)

```

## IAM YAML

The iam definition should be specified in a YAML file that is later used by this action. This allows us to handle
permissions and roles for this service.

By default, the action will load `iam.yaml` from the repository base directory.

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
| `roles.desc` | The description of the role, (max 20 characters)       | No             |
| `roles.permissions`             | An list of permissions this role should contain                                                                                 | No       |       |

### YAML Examples

#### create permissions and roles

This example defines a iam yaml that creates roles and permissions
for the DAS system iam
```yaml
system:
  id: iam
  description: Identity and access management api
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
      - 'tenants.create'
      - 'tenants.get'
      - 'tenants.update'
      - 'tenants.delete'
      - 'tenants.special'
  - name: readonly
    desc: IAM readonly
    permissions:
      - 'tenants.get'

```