# status-check

GitHub Action to create or update a status check on a commit. This action is useful in combination
with [`repository_dispatch`](../repository-dispatch#readme) to update the pull request status on a
remote repository.

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
  repository_dispatch:
    types: [demo]

jobs:
  start-status:
    runs-on: ubuntu-latest
    steps:
      - uses: extenda/actions/status-check@v0
        with:
          service-account-key: ${{ secrets.SECRET_AUTH }}
          repository: ${{ github.event.client_payload.repository }}
          sha: ${{ github.event.client_payload.sha }}
          context: terraform/plan
          state: pending
          description: Terraform plan
          target-url: https://github.com/${{ github.repository }}/actions/runs/${{ github.run_id }}

      # ... The build steps.

      - uses: extenda/actions/status-check@v0
        if: always()
        with:
          service-account-key: ${{ secrets.SECRET_AUTH }}
          repository: ${{ github.event.client_payload.repository }}
          sha: ${{ github.event.client_payload.sha }}
          context: terraform/plan
          state: ${{ job.status }}
          description: Terraform plan
```
