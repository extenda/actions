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

### Check destroyed resources

When a plan destroys resources, the comment includes automated checks that the resources are no longer in use,
followed by a checklist for what can't be checked automatically. The checks cover:

* Destroyed service accounts (`google_service_account`)
* Destroyed DNS records (`google_dns_record_set`)
* Repositories the pull request removes: the repository name and the `cloud-run.service` name in its `cloud-deploy.yaml`.
  A repository counts as removed when the plans destroy all of its `github_actions_secret` resources, and the pull
  request removes lines naming its service without adding any. The plans alone are not trusted: when the pull request
  is behind the base branch, they also destroy what was added there since. Services in the repository that the pull
  request keeps are not checked.
* Service entries deleted from an organization `project.yaml`. Entries also added elsewhere in the pull request are
  treated as moved, not removed. These names are checked even when the plan does not destroy GitHub Actions secrets
  for their repository.
* DNS names of repositories the pull request removes, read from `domain-mappings` in the repository's `cloud-deploy.yaml`.

Each resource is checked for references:

* In other repositories in the organization, found with GitHub code search. Code search only covers default branches.
  References from the repository of a service the pull request removes are ignored.
* For DNS names of a repository the pull request removes: in the `cloud-deploy.yaml` of another service. This happens when a new
  service takes over the URI of that service, so the domain must be kept. The comment then warns
  `DNS <name> is re-used by service <service>. Do not destroy this DNS record.`, with the `service` from that
  `cloud-deploy.yaml`, or `by another service in <org/repo>` if it has none.
* Left in the pull request. The checkout is searched if it is the commented repository. Otherwise, code search hits in
  the commented repository are read from the pull request head, so definitions the pull request removes don't count.

The results are grouped by removed service, covering its service name, repository name, DNS names and service
account. Each removed service gets a heading with one collapsed *Findings ( N )* list: the files referencing it in
the environments the pull request changes, each listed once, in a block like the plans with links to the files. Files
in the pull request's own repository come first, then files that may still use the service, followed by files that
only mention it. A red heading means usage was found, a search failed or there is a warning. An orange heading means
no usage was found: either no files at all, shown as "No findings, make also sure that no customers are using your
resource.", or only mentions, which are still listed. A failed search is shown as "not able to check, please check
manually (…)" and counts the service as possibly in use in the summary at the top.

Destroyed resources that belong to no removed service are grouped under *Other destroyed resources*. This group, and
the removed services when the plans are not for department environments, is one collapsed line with the number of
files that may still use the service, its DNS names and its service account, the number of files that only mention
them in documentation or comments and the number of failed searches. Expanded, it lists the files in the same order.

Mentions in documentation files
and in comment lines (`//`, `#`, `/*`, `* ` and `<!--`) don't count as usage, but are listed for review, as a comment
can tell that the code still uses the resource, e.g. through a gateway. A file counts as usage if any line referencing
the resource is not a comment.

The comment also warns when the pull request is behind its base branch, in its own section between the plan output
and the destroyed resources. Its plans could then also add or destroy resources added or destroyed on the base branch
since, and destroyed resources added there are flagged.

The checks only read from GitHub. Resources that may still be in use are reported as warnings in the comment and
as workflow annotations, the check never fails the action.

Code search needs a token with read access to the organization's repositories, set with
`check-destroyed-resources-token` if the `github-token` doesn't have it. Without `check-destroyed-resources-token`,
the comment shows "Searched only repositories visible to github-token; set check-destroyed-resources-token for an
org-wide search." The action can't tell what `github-token` can read, so set `check-destroyed-resources-token`, even
to the same token, to hide it.

```yaml
      - name: Add pull request comment
        uses: extenda/actions/terraform-plan-comment@v0
        with:
          working-directory: infra
          check-destroyed-resources-token: ${{ secrets.ORG_READ_TOKEN }}
```

The checks are enabled by default. Set `check-destroyed-resources: false` to disable them and only show the
checklist.

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
