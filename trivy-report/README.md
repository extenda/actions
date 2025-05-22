# Trivy-report

## Description

This action generates a report from Trivy scan results. It takes the output of a Trivy scan in TXT format. The report includes information about vulnerabilities, misconfigurations, and secrets found in the scanned image.

## Inputs

| Input | Description | Default |
|-------|-------------|---------|
| image-ref | The image reference to scan. | `''` |
| application-name | The name of the application. | `''` |
| github-token | The GitHub token to use for authentication. | `''` |
| channel | The Slack channel to use for the report. | `''` |
| level | The severity level that will trigger Slack notification | `'CRITICAL\|HIGH'` |


## Usage

```yaml

- uses: extenda/actions/trivy-report@v0
  with:
    image-ref: '${{ env.IMAGE_NAME }}:${{ github.sha }}'
    application-name: ${{ env.APPLICATION_NAME }}
    github-token: ${{ secrets.GCLOUD_AUTH_STAGING }}
    channel: github-clan-eva

```

