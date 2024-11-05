# Quality Gate

GitHub Action to run quality gate analysis in your pipeline.

### Usage

Using the flag `[skip quality]` in you commit message will disable this action.

The action will also not run if dependabot is the committer.

Minimal configuration:
```yaml
steps:
  - uses: ...

  - uses: extenda/actions/quality-gate@v0
    with:
      token: ${{ secrets.QODANA_TOKEN }}
      coverage-dir: './path/coverage'
```

Full configuration:
```yaml
steps:
  - uses: ...

  - uses: extenda/actions/quality-gate@v0
    with:
      token: ${{ secrets.QODANA_TOKEN }}
      coverage-dir: './path/coverage'
      baseline: 'qodana.sarif.json'
```
