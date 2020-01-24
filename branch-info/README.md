# branch-info

Helper step that used $GITHUB_REF to get simple-branch-name, suffix, and is-prerelease.
Given that $GITHUB_REF is 'refs/heads/feature/RS-12345_feature_name':
 * simple-branch-name - returns 'feature/RS-12345_feature_name'
 * suffix - returns 'feature-RS-12345-feature-name'
 * is-prerelease - returns true since the simple-branch-name is not master

## Usage

See [action.yml](action.yml).

### Basic Usage

This example prints the outputs from branch-info

```yaml
on: push
jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v1      
    
      - name: Branch info
        uses: extenda/actions/branch-info@master
        id: branch-info

      - name: Print outputs from branch-info
        run: |
          echo ${{ steps.branch-info.outputs.simple-branch-name }} && \
          echo ${{ steps.branch-info.outputs.suffix }} && \
          echo ${{ steps.branch-info.outputs.is-prerelease }}
```
