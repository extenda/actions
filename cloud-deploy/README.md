# cloud-deploy

This is a GitHub Action to deploy a service with [Cloud Deploy](https://cloud.google.com/sdk/gcloud/reference/deploy).
It supports three types of deployment targets

  * Managed Cloud Run
  * Kubernetes Deployment
  * Kubernetes StatefulSet

## Usage

See [action.yml](action.yml).

See the [schema documentation](schema_doc.md) for details about the `cloud-deploy.yaml`.

### Secrets

This action requires a GCP service account key with permission to deploy the cloud run services.
Once created, the JSON key should be `base64` encoded and added as secret in the GitHub repository.

**Important:** Always store service account keys as GitHub secrets. Never commit them to your repository.

### Example Workflow

```yaml
name: Deploy Service

on:
  push:
    branches:
      - master

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build Docker image
        run: docker build -t my-image:${{ github.sha }} .

      - name: Deploy to Cloud
        uses: extenda/actions/cloud-deploy@v0
        with:
          secrets-account-key: ${{ secrets.SECRET_AUTH }}
          service-account-key: ${{ secrets.GCLOUD_AUTH_STAGING }}
          image: my-image:${{ github.sha }}
          update-dns: if-missing
```

### Configuration File

The action will read a `cloud-deploy.yaml` file for its configuration.

## YAML Configuration Examples

The following examples demonstrate common deployment configurations for different use cases.
Each example includes inline explanations and can be adapted to your specific requirements.

### Managed Cloud Run

#### Basic Cloud Run service with IAM security

The security sidecar will use default resources. This example shows the minimal configuration
for a Cloud Run service with IAM-based authentication.

```yaml
cloud-run:
  service: my-service
  resources:
    cpu: 1
    memory: 512Mi
  protocol: http
  scaling:
    concurrency: 80

security:
  permission-prefix: mye

labels:
  product: my-product
  component: my-component

environments:
  production:
    min-instances: 1
    domain-mappings:
      - my-service.retailsvc.com
      - my-service.retailsvc-test.com
    env: &env
      KEY: value
  staging:
    min-instances: 0
    max-instances: 1
    domain-mappings:
      - my-service.retailsvc.dev
    env:
      <<: *env
```

#### Cloud Run service with SQL instance connection

```yaml
cloud-run:
  service: my-service
  resources:
    cpu: 1
    memory: 512Mi
  protocol: http
  scaling:
    concurrency: 80

security:
  permission-prefix: mye

labels:
  product: my-product
  component: my-component

environments:
  production:
    min-instances: 1
    domain-mappings:
      - my-service.retailsvc.com
      - my-service.retailsvc-test.com
    env: &env
      SQL_INSTANCE_NAME: sm://*/secret-name # Important ENV variable
  staging:
    min-instances: 0
    max-instances: 1
    domain-mappings:
      - my-service.retailsvc.dev
    env:
      <<: *env
```

#### Cloud Run service with IAM bindings

```yaml
cloud-run:
  service: my-service
  resources:
    cpu: 1
    memory: 512Mi
  protocol: http
  scaling:
    concurrency: 80

security:
  consumers:
    service-accounts:
      - my-service@project-id.iam.gserviceaccount.com
      - user:user-account@extendaretail.com
      - group:group-account@extendaretail.com
    audiences:
      - https://my-service.retailsvc.com
      - my-service

```

**Configuration:**
- `service-accounts`: List of service accounts, users (prefix with `user:`), or groups (prefix with `group:`) allowed to invoke the service
- `audiences`: List of allowed audiences in JWT tokens for authentication

#### Cloud Run service with Cloud Armor

Protect your Cloud Run service with a Cloud Armor security policy to defend against DDoS attacks
and other web-based threats.

```yaml
cloud-run:
  service: my-service
  resources:
    cpu: 1
    memory: 512Mi
  protocol: http
  scaling:
    concurrency: 80

security:
  cloud-armor:
    policy-name: cloud-armor-policy-name

labels:
  product: my-product
  component: my-component

environments:
  production:
    min-instances: 1
```

**Note:** The Cloud Armor policy must be created beforehand in your GCP project.

#### Cloud Run with performance optimization

This example demonstrates advanced Cloud Run features for optimizing performance and resource usage:
- **startup-cpu-boost**: Allocates extra CPU during container startup for faster cold starts
- **cpu-throttling**: Disabled to keep CPU available even when not serving requests (useful for background tasks)
- **session-affinity**: Enabled to route requests from the same client to the same instance
- **request-logs**: Configured to reduce logging overhead while keeping error logs

```yaml
cloud-run:
  service: my-service
  resources:
    cpu: 2
    memory: 1Gi
  protocol: http
  scaling:
    concurrency: 100
  startup-cpu-boost: true
  cpu-throttling: false
  session-affinity: true
  request-logs:
    cloud-run: false
    load-balancer: false

security:
  permission-prefix: mye

labels:
  product: my-product
  component: my-component

environments:
  production:
    min-instances: 2
    max-instances: 50
    domain-mappings:
      - my-service.retailsvc.com
```

**Note:** Request logs for 429 and 5xx responses are always logged, even when `cloud-run: false`.

#### Cloud Run with scheduled scaling

Automatically scale your service up and down based on time of day to optimize costs.
This example scales up at 07:00 UTC and down to 0 instances at 22:00 UTC.

**Important notes:**
- All times are in UTC
- Scaling triggers run every 30 minutes at :00 and :30
- If scale-hours is set to 07:50, scaling will occur at 08:00
- The `min-instances` value in the environment is used during scale-up hours
- Outside scale-hours, instances scale to 0

```yaml
cloud-run:
  service: my-service
  resources:
    cpu: 1
    memory: 512Mi
  protocol: http
  scaling:
    concurrency: 80
    schedule:
      - scale-hours: 07:00-22:00
        region: europe-west1

security:
  permission-prefix: mye

labels:
  product: my-product
  component: my-component

environments:
  production:
    min-instances: 1
    domain-mappings:
      - my-service.retailsvc.com
```

#### Cloud Run with path-based routing

Route different URL paths to different backend services or Cloud Storage buckets using path-based routing.
This example shows how to route different API versions to separate services.

```yaml
cloud-run:
  service: my-service
  resources:
    cpu: 1
    memory: 512Mi
  protocol: http
  scaling:
    concurrency: 80

security:
  permission-prefix: mye

labels:
  product: my-product
  component: my-component

environments:
  production:
    min-instances: 1
    domain-mappings:
      - my-service.retailsvc.com
      - my-service.retailsvc-test.com
    path-mappings:
      - paths:
          - /login/*
          - /api/v2/*
          - /api/beta/*
        service: my-service-a
        path-rewrite: /
      - paths:
          - /api/v3/*
        service: my-service-b
```

**Example:** A request to `my-service.retailsvc.com/api/v2/feature` will be routed to
`my-service-a` with the path rewritten to `/feature`.

**Configuration:**
- `service` or `bucket`: Target backend service or Cloud Storage bucket (must exist in the same project)
- `paths`: URL path patterns to match for this target
- `path-rewrite`: Optional path prefix to rewrite on the downstream service

#### Cloud Run with static egress IP

Configure your Cloud Run service to route all outgoing traffic through a NAT router with a static public IP address.
This is useful when your service needs to communicate with external APIs or services that require IP whitelisting.

**Note:** While IP whitelisting is generally discouraged in favor of more secure authentication methods,
it may be required when integrating with legacy systems or third-party services.

```yaml
cloud-run:
  service: my-service
  resources:
    cpu: 1
    memory: 512Mi
  protocol: http
  scaling:
    concurrency: 80
  traffic:
    static-egress-ip: true

security:
  permission-prefix: mye

labels:
  product: my-product
  component: my-component

environments:
  production:
    min-instances: 1
    env:
      EXTERNAL_API_URL: https://api.example.com
```

**Configuration:**
- `static-egress-ip`: Set to `true` (default) to route egress traffic through a NAT router with a static public IP
- When enabled, all outbound requests from the service will appear to originate from the same static IP address
- The static IP address is managed by the platform and shared across services in the same region
- Set to `false` to use direct VPC egress without a static IP (better performance, no IP whitelisting capability)

#### Cloud Run with Prometheus and Open Telemetry monitoring

A `collector` sidecar can be configured on Cloud Run to collect Prometheus and Open Telemetry metrics and traces.
The same sidecar supports both Prometheus and Open Telemetry.

**Prometheus configuration:**
- Set the `prometheus` section if your service exposes a metrics endpoint to be scraped
- Scraping is performed on the internal service port 8080 and will not pass through the security sidecar
- Default scraping path is `/metrics`, but can be customized

**Open Telemetry configuration:**
- Set the `open-telemetry` key to activate the Open Telemetry feature in the collector
- The default `auto` configuration should be correct for most solutions on Google Cloud
- Configuration is injected as environment variables on the user container to enable auto instrumentation
- The collector exposes an OTLP endpoint which is the default exporter
- By default, only `traces` are collected. Use `collect: [traces, metrics]` to also collect OTEL metrics

```yaml
cloud-run:
  service: my-service
  resources:
    cpu: 1
    memory: 512Mi
  protocol: http
  scaling:
    concurrency: 80
  monitoring:
    prometheus:
      interval: 60
      path: /metrics
      port: 8080
    open-telemetry:
      config: auto

security:
  permission-prefix: mye

labels:
  product: my-product
  component: my-component

environments:
  production:
    min-instances: 1
```

#### Cloud Run with advanced Open Telemetry configuration

For more control over Open Telemetry behavior, you can customize the collector configuration:

```yaml
cloud-run:
  service: my-service
  resources:
    cpu: 1
    memory: 512Mi
  protocol: http
  scaling:
    concurrency: 80
  monitoring:
    open-telemetry:
      config:
        sampler: parentbased_traceidratio
        sampler-ratio: 0.5
        propagators: [tracecontext, baggage]
        otlp-exporter-protocol: grpc
        collect: [traces, metrics]

security:
  permission-prefix: mye

labels:
  product: my-product
  component: my-component

environments:
  production:
    min-instances: 1
```

**Configuration options:**
- `sampler`: Sampling strategy (e.g., `parentbased_traceidratio`, `always_on`, `always_off`)
- `sampler-ratio`: Sampling ratio (0.0 to 1.0) when using ratio-based sampling
- `propagators`: Context propagation formats (e.g., `tracecontext`, `baggage`, `b3`)
- `otlp-exporter-protocol`: Protocol for exporting data (`grpc` or `http/protobuf`)
- `collect`: Signals to export (`traces`, `metrics`, or both)

#### Cloud Run with CORS enabled

Enable CORS (Cross-Origin Resource Sharing) support in the security proxy for services that need
to handle preflight requests from web browsers.

**Note:** CORS settings only work when using an auth-proxy (default: `envoy-opa`).

```yaml
cloud-run:
  service: my-service
  resources:
    cpu: 1
    memory: 512Mi
  protocol: http
  scaling:
    concurrency: 80

security:
  permission-prefix: mye
  cors:
    enabled: true

labels:
  product: my-product
  component: my-component

environments:
  production:
    min-instances: 1
    domain-mappings:
      - my-service.retailsvc.com
```

#### Cloud Run with internal load balancer access

Configure whether your service should be accessible via the internal load balancer at `service-name.internal`.
This is enabled by default and is required for service-to-service communication within your VPC.

```yaml
cloud-run:
  service: my-service
  resources:
    cpu: 1
    memory: 512Mi
  protocol: http
  scaling:
    concurrency: 80
  internal-traffic: true

security:
  permission-prefix: mye

labels:
  product: my-product
  component: my-component

environments:
  production:
    min-instances: 1
    domain-mappings:
      - my-service.retailsvc.com
    env:
      SERVICE_MODE: production
```

**Configuration:**
- `internal-traffic: true` (default): Service is accessible via internal load balancer at `my-service.internal` for VPC-internal communication
- `internal-traffic: false`: Disables internal load balancer access; service is only reachable via external domain mappings
- Both internal and external access can be enabled simultaneously by keeping `internal-traffic: true` and configuring `domain-mappings`

**Note:** Most services should keep `internal-traffic: true` to enable service-to-service communication within your infrastructure.

#### Cloud Run with multi-region deployment

> [!WARNING]
> Multi-region deployments are currently in preview and may be subject to change without notice.

Deploy your service to multiple Google Cloud regions for high availability and reduced latency.
Each region can have its own configuration.

```yaml
cloud-run:
  service: my-service
  resources:
    cpu: 2
    memory: 1Gi
  protocol: http
  scaling:
    concurrency: 100

security:
  permission-prefix: mye

labels:
  product: my-product
  component: my-component

environments:
  production:
    min-instances: 2
    max-instances: 100
    domain-mappings:
      - my-service.retailsvc.com
    regions:
      - europe-west1
      - us-central1
      - asia-northeast1
    env: &env
      DATABASE_URL: sm://*/database-connection-string
  staging:
    min-instances: 0
    max-instances: 5
    regions:
      - europe-west1
    env:
      <<: *env
```

**Note:** Multi-region deployments automatically set up global load balancing across all specified regions.

#### Cloud Run with comprehensive configuration

This example demonstrates combining multiple advanced features in a production-ready configuration:

```yaml
cloud-run:
  service: my-production-service
  resources:
    cpu: 2
    memory: 2Gi
  protocol: http
  timeout: 60
  scaling:
    concurrency: 100
    schedule:
      - scale-hours: 06:00-23:00
        region: europe-west1
  traffic:
    static-egress-ip: true
    direct-vpc-connection: false
  startup-cpu-boost: true
  cpu-throttling: true
  session-affinity: false
  monitoring:
    prometheus:
      interval: 60
      path: /metrics
      port: 8080
    open-telemetry:
      config:
        sampler: parentbased_traceidratio
        sampler-ratio: 0.1
        collect: [traces, metrics]
  request-logs:
    cloud-run: true
    load-balancer: false

security:
  permission-prefix: mye
  cloud-armor:
    policy-name: production-armor-policy
  cors:
    enabled: true
  resources:
    cpu: 0.5
    memory: 512Mi

labels:
  product: my-product
  component: my-component
  iso-country: global

environments:
  production:
    min-instances: 3
    max-instances: 100
    domain-mappings:
      - my-service.retailsvc.com
      - my-service.retailsvc-test.com
    path-mappings:
      - paths:
          - /api/v1/*
        service: my-service-v1
        path-rewrite: /
    regions:
      - europe-west1
      - us-central1
    env: &env
      DATABASE_URL: sm://*/database-url
      REDIS_URL: sm://*/redis-url
      LOG_LEVEL: info
  staging:
    min-instances: 0
    max-instances: 5
    domain-mappings:
      - my-service.retailsvc.dev
    env:
      <<: *env
      LOG_LEVEL: debug
```

### Kubernetes

The action supports deploying to Google Kubernetes Engine (GKE) Autopilot clusters with both
Deployment and StatefulSet resources.

#### Kubernetes Deployment with IAM security

A Kubernetes deployment with IAM security and customized resource allocation for the security sidecar.

```yaml
kubernetes:
  type: Deployment
  service: my-service
  resources:
    cpu: 1
    memory: 512Mi
  protocol: http
  scaling:
    cpu: 50

security:
  permission-prefix: mye
  resources:
    cpu: 1
    memory: 1Gi

labels:
  product: my-product
  component: my-component

environments:
  production:
    min-instances: 1
    max-instances: 20
    domain-mappings:
      - my-service.retailsvc.com
      - my-service.retailsvc-test.com
    env: &env
      KEY: value
  staging:
    min-instances: 1
    max-instances: 1
    domain-mappings:
      - my-service.retailsvc.dev
    env:
      <<: *env
```

#### Kubernetes Deployment with vertical scaling

Configure vertical scaling to automatically adjust CPU and memory resources based on actual usage.
This is useful for workloads with variable resource requirements.

```yaml
kubernetes:
  type: Deployment
  service: my-service
  resources:
    cpu: 1
    memory: 512Mi
  protocol: http
  scaling:
    cpu: 50
    vertical:
      threshold: 50
      increments-cpu: 1
      max-cpu: 5
      max-memory: 8Gi
      scale-up-interval: 8
      scale-up-threshold: 5

security:
  permission-prefix: mye

labels:
  product: my-product
  component: my-component

environments:
  production:
    min-instances: 2
    max-instances: 20
    domain-mappings:
      - my-service.retailsvc.com
```

**Vertical scaling behavior:**
- Every minute, the autoscaler checks pod CPU usage
- If any pod uses CPU above the threshold (50%), a scale-up is triggered
- Scale-up increases CPU by `increments-cpu` (1 core) up to `max-cpu` (5 cores)
- Scale-up can only occur 8 minutes after the previous scale-up
- Scale-down occurs 30 minutes after the last scale-up when CPU is below threshold
- A scale-up requires 5 consecutive successful checks before triggering

**Configuration:**
- `threshold`: CPU percentage utilization to trigger vertical scaling (10-100%)
- `increments-cpu`: CPU increase per scale-up event
- `max-cpu`: Maximum CPU cores allowed
- `max-memory`: Maximum memory allowed (scales proportionally with CPU)
- `scale-up-interval`: Minimum minutes between scale-up events
- `scale-up-threshold`: Number of consecutive checks before scaling up

#### Kubernetes Deployment as internal service

An internal Kubernetes gRPC service without IAM security. The request timeout has been increased from
the default 300s to 900s (15 minutes) for long-running operations. This service will only be available
on the internal domain.

```yaml
kubernetes:
  type: Deployment
  service: my-service
  resources:
    cpu: 1
    memory: 512Mi
  protocol: http2
  timeout: 900
  scaling:
    cpu: 50

security: none

labels:
  product: my-product
  component: my-component

environments:
  production:
    min-instances: 1
    env: &env
      KEY: value
  staging:
    min-instances: 1
    max-instances: 1
    env:
      <<: *env
```

**Note:** Use `protocol: http2` for gRPC services. Set `security: none` to disable IAM authentication.

#### Kubernetes Deployment with Prometheus monitoring

GKE Autopilot includes managed Prometheus. Configure a `PodMonitoring` resource to automatically
scrape metrics from your pods. This example collects metrics every 60 seconds from the `/metrics` endpoint.

Scraping is performed on the internal service port 8080 and does not pass through the security sidecar,
so your application can expose metrics without authentication overhead.

```yaml
kubernetes:
  type: Deployment
  service: my-service
  resources:
    cpu: 1
    memory: 512Mi
  protocol: http
  scaling:
    cpu: 50
  monitoring:
    prometheus:
      interval: 60

security:
  permission-prefix: mye

labels:
  product: my-product
  component: my-component

environments:
  production:
    min-instances: 1
    max-instances: 20
    domain-mappings:
      - my-service.retailsvc.com
      - my-service.retailsvc-test.com
    env: &env
      KEY: value
  staging:
    min-instances: 0
    max-instances: 1
    domain-mappings:
      - my-service.retailsvc.dev
    env:
      <<: *env
```

#### Kubernetes Deployment with Open Telemetry

Open Telemetry is supported on GKE Autopilot using a collector sidecar. The configuration is similar to Cloud Run,
but Prometheus scraping in Kubernetes always uses `PodMonitoring` resources instead of the collector sidecar.

The collector sidecar is only used for Open Telemetry traces and metrics. By default, only `traces` are collected.
To also collect OTEL `metrics`, use `collect: [traces, metrics]`.

This configuration works the same way for both `Deployment` and `StatefulSet`.

```yaml
kubernetes:
  type: Deployment
  service: my-service
  resources:
    cpu: 1
    memory: 512Mi
  protocol: http
  scaling:
    cpu: 50
  monitoring:
    open-telemetry:
      config: auto

security:
  permission-prefix: mye

labels:
  product: my-product
  component: my-component

environments:
  production:
    min-instances: 1
    max-instances: 20
    domain-mappings:
      - my-service.retailsvc.com
      - my-service.retailsvc-test.com
    env:
      KEY: value
```

#### Kubernetes StatefulSet with persistent storage

A Kubernetes StatefulSet for stateful applications that require persistent storage. This example doesn't use
IAM security and has a persistent SSD volume mounted at `/mnt/shared/data`.

StatefulSets are ideal for applications that need:
- Stable, unique network identifiers
- Stable, persistent storage
- Ordered, graceful deployment and scaling

```yaml
kubernetes:
  type: StatefulSet
  service: my-service
  resources:
    cpu: 1
    memory: 512Mi
  protocol: http
  scaling:
    cpu: 50
  volumes:
    - disk-type: ssd
      size: 5Gi
      mount-path: /mnt/shared/data

security: none

labels:
  product: my-product
  component: my-component

environments:
  production:
    min-instances: 3
    max-instances: 3
    env: &env
      KEY: value
  staging:
    min-instances: 1
    max-instances: 1
    env:
      <<: *env
```

**Volume configuration:**
- `disk-type`: Type of persistent disk (`ssd` or `standard`)
- `size`: Disk size (e.g., `5Gi`, `10Gi`, `100Gi`)
- `mount-path`: Directory where the volume will be mounted in the container

**Note:** StatefulSets maintain a sticky identity for each pod. If a pod is rescheduled, it maintains
the same name and persistent volume.

## Best Practices and Tips

### Environment Variables and Secrets

Use Secret Manager references for sensitive configuration:

```yaml
environments:
  production:
    env:
      DATABASE_URL: sm://*/database-url
      API_KEY: sm://*/api-key
      PUBLIC_URL: https://my-service.retailsvc.com
```

The `sm://*/secret-name` syntax automatically retrieves secrets from Google Secret Manager.

### Resource Sizing

Start with conservative resource allocations and monitor usage:

**Cloud Run:**
- Start with `cpu: 1` and `memory: 512Mi`
- Enable `startup-cpu-boost: true` if cold starts are slow
- Use `cpu-throttling: false` only for background tasks that need continuous CPU

**Kubernetes:**
- Start with `cpu: 1` and `memory: 512Mi`
- Set `scaling.cpu: 50` for moderate autoscaling responsiveness
- Consider vertical scaling for workloads with unpredictable resource needs

### Scaling Configuration

**For Cloud Run:**
- Set `min-instances: 0` in staging to save costs
- Set `min-instances: 1-3` in production to avoid cold starts
- Use scheduled scaling for predictable traffic patterns
- Set appropriate `concurrency` based on your application (50-100 for I/O bound, lower for CPU bound)

**For Kubernetes:**
- Set `min-instances` based on required availability (1-3 for production)
- Configure `max-instances` based on expected peak load
- Use `availability: high` for critical services

### Monitoring and Observability

- Enable Prometheus for application metrics
- Enable Open Telemetry for distributed tracing
- Use `request-logs.cloud-run: false` in high-traffic services to reduce log costs
- Always monitor error logs (429 and 5xx are logged regardless of settings)

### Security

- Always use the `permission-prefix` for IAM-based authentication
- Use Cloud Armor for DDoS protection on public-facing services
- Enable CORS only when needed for browser-based clients
- Keep `internal-traffic: true` (default) to enable service-to-service communication within your VPC
- Use IAM bindings (`consumers.service-accounts`) for service-to-service authentication

### Multi-Region Deployments

- Deploy to multiple regions for high availability
- Use `europe-west1` as the primary region for European services
- Add `us-central1` and `asia-northeast1` for global services
- Global load balancing is automatically configured

### Domain Mappings and DNS

- Use `update-dns: if-missing` (default) to avoid accidental DNS changes
- Use `update-dns: always` only when migrating DNS entries
- Configure path-mappings for API versioning and routing

## Development

The `cloud-deploy` JSON schema documentation is generated with [json-schema-for-humans](https://github.com/coveooss/json-schema-for-humans).

Install it with pip

```bash
pip install json-schema-for-humans
```

And use the command below to update the generated documentation.

```bash
generate-schema-doc --config template_name=md cloud-deploy/src/utils/cloud-deploy.schema.json cloud-deploy/schema_doc.md
```
