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
| `name`                     | The name of the service system | Yes                                   
| `permission-prefix`                     | The permission prefix, this will be prefixed to every permission and roles id.            | Yes                         
| `services`                     | A list of services that need a DAS system                                     
| `services.name`                     | The service name of the system to be created                                                                                                                                                 | Yes      |               |
| `services.repository`                   | The description of the service                                                                                                      | Yes      |               |
| `permissions`                      | An object containing the permissions for this service.                             | No      |               |
| `roles`              | An list of roles that should exist for this service                                        | No       |         |
| `roles.id`            | The role id                                                          | No       |          |
| `roles.name`            | The role name                                                          | No       |          |
| `roles.desc` | The description of the role, (max 20 characters)       | No             |
| `roles.permissions`             | An list of permissions this role should contain                                                                                 | No       |       |

### YAML Examples

#### Create permissions and roles

This example defines a YAML file that creates roles and permissions for the DAS system `iam`
```yaml
name: Braveheart Quotes
permission-prefix: bhq
services:
  - name: braveheart-quotes
    repository: braveheart-quotes-service
  - name: braveheart-quotes-webclient-be
    repository: braveheart-quotes-webclient-backend
permissions:
  favorite:
    - toggle
    - list
  quote:
    - create
    - delete
    - get
    - list
    - update
roles:
  - id: admin
    name: Braveheart Quotes Admin
    desc: Create, modify and delete movie quotes.
    permissions:
      - quote.create
      - quote.delete
      - quote.get
      - quote.list
      - quote.update
  - id: user
    name: Braveheart Quotes User
    desc: Read and like movie quotes.
    permissions:
      - favorite.toggle
      - favorite.list
      - quote.get
      - quote.list


```
