# repository-dispatch

GitHub Action to trigger a `repository_dispatch` event on another repository.
The action requires a GitHub token with write permissions on the target repository.
Do not use the `GITHUB_TOKEN` provided by GitHub Actions as it won't trigger workflows
to break potential circular builds.

## Usage

See [action.yml](action.yml).

### Secrets

If this action is used with GCP Secret Manager it requires a GCP service account key with permission to access
secret payloads. Once created, the JSON key should be `base64` encoded and added as secret in the GitHub repository.

It is recommended that the service account _only_ has permissions to access secrets. Do not allow modifications or
access to any other resources in your project.

### Examples

#### Usage With Secret Manager

This example will load a `github-token` named secret from the GCP Secret Manager accessible using
the provided `service-account-key`. The default secret name can be modified with the
`github-token-secret-name` input variable.

```yaml
on:
  - push
  - pull_request

jobs:
  dispatch:
    runs-on: ubuntu-latest
    steps:
      - uses: extenda/actions/repository-dispatch@v0
        with:
          service-account-key: ${{ secrets.SECRET_AUTH }}
          target-repository: extenda/tf-infra-gcp
          event-type: clan-infra
```
