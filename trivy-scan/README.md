# trivy-scan

This GitHub Action scans Docker images for vulnerabilities using [Trivy](https://github.com/aquasecurity/trivy) and generates Software Bill of Materials (SBOM) files in both SPDX and CycloneDX formats. The action provides comprehensive vulnerability reporting through GitHub job summaries and optional Slack notifications.

## Features

- 🔍 **Vulnerability Scanning** - Detects security vulnerabilities in Docker images
- 📊 **SBOM Generation** - Creates SPDX and CycloneDX SBOM files for compliance
- ☁️ **Artifact Registry Integration** - Optionally uploads SBOMs to Google Artifact Registry
- 📝 **GitHub Job Summaries** - Displays scan results directly in GitHub Actions UI
- 💬 **Slack Notifications** - Sends vulnerability alerts to Slack channels
- ⚙️ **Flexible Configuration** - Customizable severity levels, timeouts, and failure policies

## Usage

See [action.yml](action.yml) for the complete list of inputs and outputs.

### Basic Example

```yaml
name: Scan Docker Image

on: push

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Scan image with Trivy
        uses: extenda/actions/trivy-scan@v0
        with:
          image: eu.gcr.io/extenda/my-image:latest
          service-account-key: ${{ secrets.GCLOUD_AUTH }}
```

### Complete Workflow with Docker Build

This example shows how to build a Docker image, push it to Google Container Registry, and scan it for vulnerabilities:

```yaml
name: Build and Scan

on: push

jobs:
  build-and-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup gcloud
        uses: extenda/actions/setup-gcloud@v0
        with:
          service-account-key: ${{ secrets.GCLOUD_AUTH }}

      - name: Authenticate Docker with GCR
        run: |
          gcloud auth configure-docker eu.gcr.io

      - name: Build Docker image
        run: |
          docker build -t eu.gcr.io/extenda/my-image:${{ github.sha }} .

      - name: Push Docker image
        run: |
          docker push eu.gcr.io/extenda/my-image:${{ github.sha }}

      - name: Scan image for vulnerabilities
        uses: extenda/actions/trivy-scan@v0
        with:
          image: eu.gcr.io/extenda/my-image:${{ github.sha }}
          service-account-key: ${{ secrets.GCLOUD_AUTH }}
          fail-on-vulnerabilities: true
          upload-sbom: true
```

### Advanced Configuration

```yaml
- uses: extenda/actions/trivy-scan@v0
  with:
    image: eu.gcr.io/extenda/my-image:${{ github.sha }}
    service-account-key: ${{ secrets.GCLOUD_AUTH }}
    # Only report HIGH and CRITICAL vulnerabilities
    severity: 'HIGH,CRITICAL'
    # Fail the build if vulnerabilities are found
    fail-on-vulnerabilities: true
    # Upload SBOMs to Google Artifact Registry
    upload-sbom: true
    # Send Slack notifications on vulnerabilities
    notify-slack-on-vulnerabilities: true
    # Only report vulnerabilities with fixes available
    ignore-unfixed: true
    # Use a specific Trivy version
    trivy-version: '0.50.0'
    # Set timeout for each Trivy invocation
    timeout: '10m0s'
```

### Using Outputs

The action provides outputs for all generated files, which can be used in subsequent steps:

```yaml
- name: Scan image
  id: scan
  uses: extenda/actions/trivy-scan@v0
  with:
    image: eu.gcr.io/extenda/my-image:latest
    service-account-key: ${{ secrets.GCLOUD_AUTH }}

- name: Upload SBOM as artifact
  uses: actions/upload-artifact@v4
  with:
    name: sbom-files
    path: |
      ${{ steps.scan.outputs.spdx-sbom }}
      ${{ steps.scan.outputs.cyclonedx-sbom }}

- name: Upload scan reports
  uses: actions/upload-artifact@v4
  with:
    name: scan-reports
    path: |
      ${{ steps.scan.outputs.json-report }}
      ${{ steps.scan.outputs.text-report }}
```

## Inputs

| Input                             | Description                                                                                                                              | Required | Default         |
|:----------------------------------|:-----------------------------------------------------------------------------------------------------------------------------------------|:---------|:----------------|
| `image`                           | The Docker image to scan. Can be a tag or digest (e.g., `eu.gcr.io/extenda/my-image:latest` or `eu.gcr.io/extenda/my-image@sha256:...`). | Yes      |                 |
| `service-account-key`             | The GCP service account key for accessing the image repository, uploading SBOMs to Artifact Registry, and sending Slack notifications.   | Yes      |                 |
| `upload-sbom`                     | Whether to upload the generated SBOM files to Google Artifact Registry. Recommended for production images to maintain CRA compliance.    | No       | `false`         |
| `fail-on-vulnerabilities`         | Set to `true` to fail the action if vulnerabilities are found. If `false`, vulnerabilities are reported but the action succeeds.         | No       | `false`         |
| `severity`                        | Comma-separated severity levels to include in the report: `UNKNOWN`, `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`. Example: `HIGH,CRITICAL`.      | No       | `HIGH,CRITICAL` |
| `ignore-unfixed`                  | Whether to ignore vulnerabilities that do not have a fix available yet.                                                                  | No       | `true`          |
| `trivy-version`                   | The version of Trivy to use for scanning. Use `latest` for the most recent version or specify a version like `0.50.0`.                   | No       | `latest`        |
| `timeout`                         | Maximum time for each Trivy invocation (e.g., `5m0s`, `10m0s`). Note: Trivy is invoked multiple times, so total runtime will be longer.  | No       | `5m0s`          |
| `notify-slack-on-vulnerabilities` | Whether to send a notification to Slack if vulnerabilities are found. The Slack channel is determined from the service account key.      | No       | `true`          |

## Outputs

| Output           | Description                                                                 |
|:-----------------|:----------------------------------------------------------------------------|
| `spdx-sbom`      | Path to the generated SPDX SBOM file (`.trivy/sbom.spdx.json`).             |
| `cyclonedx-sbom` | Path to the generated CycloneDX SBOM file (`.trivy/sbom.cdx.json`).         |
| `json-report`    | Path to the Trivy scan report in JSON format (`.trivy/report.json`).        |
| `text-report`    | Path to the Trivy scan report in compact text format (`.trivy/report.txt`). |

## Secrets and Service Account

The `service-account-key` input requires a GCP service account with the following permissions:

- **Image Repository Access** - Read access to pull the Docker image from GCR/Artifact Registry
- **Artifact Registry Upload** (if `upload-sbom: true`) - Write access to upload SBOM files
- **Slack Notifications** (if `notify-slack-on-vulnerabilities: true`) - Access to send messages to Slack

### Security Best Practices

1. **Store service account keys as GitHub secrets** - Never commit service account keys to your repository
2. **Use minimal permissions** - Grant only the permissions required for your use case
3. **Scan before deployment** - Run vulnerability scans before deploying images to production
4. **Set `fail-on-vulnerabilities: true` for production** - Prevent vulnerable images from being deployed
5. **Use image digests** - Reference images by digest (SHA256) rather than tags for immutable scans

## Understanding Scan Results

The action generates a GitHub job summary with vulnerability findings:

- **Total vulnerabilities** - Count of all vulnerabilities found
- **By severity** - Breakdown by CRITICAL, HIGH, MEDIUM, LOW, UNKNOWN
- **Detailed table** - Lists each unique vulnerability with package information

### Severity Levels

- **CRITICAL** - Immediate action required; actively exploitable vulnerabilities
- **HIGH** - Should be fixed soon; potentially exploitable
- **MEDIUM** - Should be addressed; lower risk
- **LOW** - Minor issues; can be addressed during regular maintenance
- **UNKNOWN** - Severity not yet determined

## Ignoring Vulnerabilities

In cases where you must use a specific image version with known vulnerabilities that don't apply to your use case, you can create a `.trivyignore` file in your repository root:

```
# .trivyignore
# Accept the risk - package not used in our runtime
CVE-2018-14618

# No impact in our configuration
CVE-2019-1543
```

⚠️ **Use this feature sparingly** and document why each CVE is being ignored.

## Multi-Architecture Images

The action automatically detects multi-architecture images. When `upload-sbom: true` is set, SBOMs are uploaded for both:

- The specific platform manifest (the artifact)
- The multi-arch index list (the product)

This ensures complete coverage for multi-arch deployments.

## Troubleshooting

### Scan Timeouts

If scans timeout on large images, increase the `timeout` input:

```yaml
with:
  timeout: '15m0s'
```

### Authentication Errors

Ensure your service account key has the correct permissions and the image URL is accessible from the GitHub Actions runner.

### Slack Notifications Not Received

If using a private Slack channel, you must invite the Slack notification bot to the channel. Check your clan's `common.hcl` file for the configured Slack channel.

## Additional Resources

- [Trivy Documentation](https://aquasecurity.github.io/trivy/)
- [SPDX SBOM Specification](https://spdx.dev/)
- [CycloneDX SBOM Specification](https://cyclonedx.org/)
- [Google Artifact Registry SBOM](https://cloud.google.com/artifact-analysis/docs/sbom)
