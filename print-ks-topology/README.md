# Print Kafka Stream App Topology

This is a GitHub Action to print Kafka Stream App topology

This action will generate Mermaid diagram for Kafka Stream App topology defined in 'docs/topology/stream.txt' or supplied in 'inputs.topologyFilePath' and commit it to project's README.md or other file supplied in 'inputs.readmeFilePath'

## Example

This example will generate Mermaid Topology Diagram.

```yaml
jobs:
  update-readme-topology:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v2

      - name: Set up Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'

      - name: Update README
        uses: extenda/actions/print-topology@v0
        with:
          topologyFilePath : ${{ inputs.topologyFilePath }}
          readmeFilePath : ${{ inputs.readmeFilePath }}
```
