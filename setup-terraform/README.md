# setup-terraform

This is a GitHub Action to set up [Terraform](http://terraform.io) and [Terragrunt](http://terragrunt.gruntwork.io).
The action defaults to reading versions to download from `.terraform-version` and `.terragrunt-version` files in the
working directory (repository root).

## Usage

See [action.yml](action.yml).

### Examples

#### Basic Usage

This example will set up `terraform` and `terragrunt` for use in subsequent steps.
The versions will be loaded from `.terraform-version` and `.terragrunt-version`.

```yaml
on: push

jobs:
  terragrunt:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: extenda/actions/setup-terragrunt@v0
```

#### Manually specified versions

This example will set up `terraform` and `terragrunt` with specified versions.

```yaml
on: push

jobs:
  terragrunt:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: extenda/actions/setup-terragrunt@v0
        with:
          terragrunt-version: 0.23.3
          terraform-version: 0.12.24
```

#### Skip Terragrunt

To skip installation of Terragrunt, pass the `skip-terragrunt` input.

```yaml
on: push

jobs:
  terragrunt:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: extenda/actions/setup-terragrunt@v0
        with:
          skip-terragrunt: true
```
