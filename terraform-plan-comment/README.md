# terraform-plan-comment

This is a GitHub Action to create a well-formatted pull request comment for output from one or more Terraform plans.
The plan(s) should be created before this action is used. Both Terraform and Terragrunt can be used to produce the plan(s).

This action depends on Terraform being available to generate the comment.
Use the [setup-terraform](../setup-terraform#readme) action to install Terraform.

This action does nothing if the commit isn't associated with an open pull request.

## Usage

See [action.yml](action.yml).

### Secrets

This action requires a GitHub token with write access to the repository. By default it will use the GitHub Actions token.
To use a different token, set the `github-token` input or pass a `GITHUB_TOKEN` environment variable.

### Examples

#### Usage With Terragrunt

This example will use Terragrunt to plan all GCP infrastructure changes and then post the output as a pull request comment.

 ```yaml
name: Infra
on: pull_request

jobs:
  plan-staging:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: extenda/actions/setup-gcloud@v0
        with:
          service-account-key: ${{ secrets.GCLOUD_AUTH_STAGING }}
          export-default-credentials: true

      - uses: extenda/actions/setup-terraform@v0

      - name: Terragrunt plan
        run: terragrunt plan-all -lock=false -compact-warnings -out=plan.out
        working-directory: infra/staging

      - name: Add pull request comment
        uses: extenda/actions/terraform-plan-comment@v0
        with:
          working-directory: infra/staging
 ```
