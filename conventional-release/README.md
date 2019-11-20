# conventional-release

This GitHub Action creates releases on GitHub based on [conventional commits](https://conventionalcommits.org). The 
action will find the latest release tag, bump the version according to conventional commits and create a new tag and 
GitHub release. The action also generates a conventional changelog as part of the release description.

Examples of generated releases:

  * https://github.com/extenda/actions/releases

## Usage

See [action.yml](action.yml).

Use the `outputs` of this action in subsequent release steps.

### Secrets

The following environment variables are required.
 
  * `GITHUB_TOKEN`: The GitHub Actions provided access token for the repository 
  
### Examples

#### Basic Usage

This example creates a new release. The `outputs` of the action are used to build the software project.

```
on: push

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@master

      - name: Create release
        uses: extenda/actions/conventional-release@v0
        id: release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Publish release
        run: |
          npm ci
          npm version ${{ steps.release.outputs.version }} --no-git-tag-version
          npm publish
```
