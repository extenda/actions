# k6

GitHub Action to run K6 acceptance test in your pipeline.

### Usage

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: extenda/actions/k6@v0
```

Optional Parameter Example:

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: extenda/actions/k6@v0
    with:
      version: '0.49.0'
      parallel: 'false'
      scripts: |
        ./acceptance/k6/quick.js
        ./acceptance/k6/long.js
```

### Optional Inputs

`flags`

  Supply additional flags to the k6 command.

`version`

  Supply the version of K6 you want to run, or latest version will be used.

`parallel`

  Execute multiple scripts in parallel.


`scripts`

  Supply the path to your script files.

`only-verify-scripts`

  Check only script integrity and skip execution.
