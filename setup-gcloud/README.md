# setup-gcloud

Set up the Google Cloud CLI (`gcloud`), authenticate it for the current job, and expose the resolved Google Cloud project ID as an output.

This action always authenticates `gcloud` from the `service-account-key` input. The input must be a **base64-encoded secret whose original content is JSON**.

Two authentication payloads are supported:

- **Workload Identity Federation (preferred)** - short-lived credentials generated from GitHub's OIDC token
- **Service account JSON key** - legacy long-lived key material

Compared with [`GoogleCloudPlatform/github-actions/setup-gcloud`](https://github.com/GoogleCloudPlatform/github-actions/tree/master/setup-gcloud), this action:

- always authenticates as part of setup
- accepts a base64-encoded JSON payload through `service-account-key`
- returns the default `project-id` as an output

## Usage

Source of truth: [`action.yml`](action.yml)

### Prerequisites

- A GitHub Actions runner that can download and run the Google Cloud CLI
- A repository or organization secret containing a **base64-encoded JSON payload**
- For **Workload Identity Federation**, the workflow must allow GitHub OIDC token requests:
  - `permissions: id-token: write`
- For **Workload Identity Federation**, your Google Cloud Workload Identity Pool and provider must already trust your GitHub repository, and the target service account must be allowed to be impersonated

### Authentication payloads

The `service-account-key` input always receives a base64-encoded string. After decoding, the JSON must match one of the following shapes.

For **Workload Identity Federation**, the secret contains configuration metadata only. The action requests a GitHub OIDC token at runtime and uses the decoded JSON to generate a credential configuration for `gcloud`.

For a **service account JSON key**, the secret contains the base64-encoded service account key JSON itself.

#### Preferred: Workload Identity Federation payload

```json
{
  "workload_identity_provider": "projects/123456789/locations/global/workloadIdentityPools/github/providers/github",
  "email": "deployer@example.iam.gserviceaccount.com",
  "project_id": "my-gcp-project"
}
```

Required fields:

- `workload_identity_provider` - full Workload Identity Provider resource name passed to `gcloud iam workload-identity-pools create-cred-config`
- `email` - service account email to impersonate
- `project_id` - default Google Cloud project for the action output and `gcloud` config

#### Legacy: service account JSON key payload

```json
{
  "type": "service_account",
  "project_id": "my-gcp-project",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "deployer@example.iam.gserviceaccount.com",
  "client_id": "..."
}
```

Required fields:

- `private_key` - identifies the payload as a JSON key credential
- `client_email` (or `email`) - service account email
- `project_id` - default Google Cloud project for the action output and `gcloud` config

> [!IMPORTANT]
> Prefer Workload Identity Federation whenever possible. It avoids storing long-lived private keys in GitHub secrets.

### Secrets

Create a GitHub secret whose value is the **base64-encoded JSON payload** you want to use for authentication, then pass that secret to `service-account-key`.

Common patterns:

- `secrets.GCLOUD_AUTH_WIF` for the preferred Workload Identity Federation payload
- `secrets.GCLOUD_AUTH_JSON_KEY` for the legacy JSON key payload

### Inputs

| Input                        | Required | Default  | Description                                                                                                                                                                           |
|------------------------------|----------|----------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `service-account-key`        | Yes      | -        | Base64-encoded JSON authentication payload. Supports both Workload Identity Federation JSON and service account JSON key credentials.                                                 |
| `version`                    | No       | `latest` | Google Cloud CLI version to install.                                                                                                                                                  |
| `export-default-credentials` | No       | `false`  | When `true`, exports credentials for later steps through `GOOGLE_APPLICATION_CREDENTIALS`. For Workload Identity Federation it also exports `CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE`. |

### Outputs

| Output       | Description                                                                        |
|--------------|------------------------------------------------------------------------------------|
| `project-id` | Default Google Cloud project ID extracted from the decoded authentication payload. |

### Security guidance

- Store `service-account-key` in GitHub Secrets, never inline in workflow YAML
- Prefer **Workload Identity Federation** over service account JSON keys
- Limit the Google Cloud permissions granted to the target service account
- If you must use a JSON key, rotate it regularly and treat it as long-lived secret material

## Examples

### Minimal example with Workload Identity Federation

This is the recommended setup.

```yaml
on: push

permissions:
  contents: read
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Check out repository
        uses: actions/checkout@v4

      - name: Set up gcloud with Workload Identity Federation
        id: gcloud
        uses: extenda/actions/setup-gcloud@v0
        with:
          service-account-key: ${{ secrets.GCLOUD_AUTH_WIF }}

      - name: Show active project
        run: gcloud config get-value project
```

### Build and push an image after setup

```yaml
on: push

permissions:
  contents: read
  id-token: write

env:
  IMAGE_NAME: my-service

jobs:
  staging:
    runs-on: ubuntu-latest
    steps:
      - name: Check out repository
        uses: actions/checkout@v4

      - name: Set up gcloud
        id: gcloud
        uses: extenda/actions/setup-gcloud@v0
        with:
          service-account-key: ${{ secrets.GCLOUD_AUTH_STAGING }}

      - name: Configure Docker for Artifact Registry or GCR
        run: gcloud auth configure-docker --quiet

      - name: Build and push Docker image
        run: |
          IMAGE="gcr.io/${{ steps.gcloud.outputs.project-id }}/${IMAGE_NAME}:${GITHUB_SHA}"
          docker build -t "$IMAGE" .
          docker push "$IMAGE"
```

### Export default credentials for later steps

Use this when later tools or SDKs should authenticate through environment variables instead of calling `gcloud` directly.

```yaml
on: push

permissions:
  contents: read
  id-token: write

jobs:
  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - name: Check out repository
        uses: actions/checkout@v4

      - name: Set up gcloud and export application default credentials
        id: gcloud
        uses: extenda/actions/setup-gcloud@v0
        with:
          service-account-key: ${{ secrets.GCLOUD_AUTH_WIF }}
          export-default-credentials: true

      - name: Run tests using exported credentials
        run: |
          echo "Project: ${{ steps.gcloud.outputs.project-id }}"
          test -n "$GOOGLE_APPLICATION_CREDENTIALS"
```

### Fallback example with a service account JSON key

Use this only when Workload Identity Federation is not available.

```yaml
on: push

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Check out repository
        uses: actions/checkout@v4

      - name: Set up gcloud with service account JSON key
        id: gcloud
        uses: extenda/actions/setup-gcloud@v0
        with:
          service-account-key: ${{ secrets.GCLOUD_AUTH_JSON_KEY }}

      - name: List clusters
        run: gcloud container clusters list --project "${{ steps.gcloud.outputs.project-id }}"
```

## Notes

- This action installs and caches the Google Cloud CLI for reuse across jobs/runs when possible
- The action always authenticates, even if `gcloud` is already installed
- With Workload Identity Federation, the action exchanges the GitHub OIDC token for a generated credential configuration before authenticating `gcloud`
