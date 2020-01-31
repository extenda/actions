# Docker Build & Push Action

Builds a Docker image and pushes it to the private registry of your choosing.

Forked and modified to fit Extenda GitHub Actions.
Credit goes to [Sean Smith](https://github.com/mr-smithers-excellent/docker-build-push).

## Basic usage

* Ensure you run the [checkout action](https://github.com/actions/checkout) before using this action
* Add the following to a workflow `.yml` file in the `/.github` directory of your repo
```yaml
steps:
  - uses: actions/checkout@v1.0

  - uses: extenda/docker@v0
    with:
      image: repo/image
      tag: latest
      registry: registry-url.io
      dockerfile: Dockerfile.ci
      username: ${{ secrets.DOCKER_USERNAME }}
      password: ${{ secrets.DOCKER_PASSWORD }}
```

## Inputs

| Name       | Description                                                                             | Required |
|------------|-----------------------------------------------------------------------------------------|----------|
| image      | Docker image name                                                                       | Yes      |
| tag        | Docker image tag (information should be available in conventional-version step)         | Yes      |
| registry   | Docker registry host (complete URL or just the registry name in Extenda AWS ECR)        | Yes      |
| dockerfile | Location of Dockerfile (defaults to `Dockerfile`)                                       | No       |
| buildArgs  | Docker build arguments in format `KEY=VALUE,KEY=VALUE`                                  | No       |
| username   | Docker registry username                                                                | No       |
| password   | Docker registry password or token                                                       | No       |

## Examples

### Docker Hub

* Save your Docker Hub username (`DOCKER_USERNAME`) and password (`DOCKER_PASSWORD`) as secrets in your GitHub repo
* Modify sample below and include in your workflow `.github/workflows/*.yml` file 

```yaml
uses: extenda/docker@v0
with:
  image: docker-hub-repo/image-name
  registry: docker.io
  username: ${{ secrets.DOCKER_USERNAME }}
  password: ${{ secrets.DOCKER_PASSWORD }}
```

### Google Container Registry (GCR)

* Create a service account with the ability to push to GCR (see [configuring access control](https://cloud.google.com/container-registry/docs/access-control))
* Create and download JSON key for new service account
* Save content of `.json` file as a secret called `DOCKER_PASSWORD` in your GitHub repo
* Modify sample below and include in your workflow `.github/workflows/*.yml` file 
* Ensure you set the username to `_json_key`

```yaml
uses: extenda/docker@v0
with:
  image: gcp-project/image-name
  registry: gcr.io
  username: _json_key 
  password: ${{ secrets.DOCKER_PASSWORD }} 
```

### AWS Elastic Container Registry (ECR)

* Create an IAM user with the ability to push to ECR (see [example policies](https://docs.aws.amazon.com/AmazonECR/latest/userguide/ecr_managed_policies.html))
* Create and download access keys
* Save `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` as secrets in your GitHub repo
* Modify sample below and include in your workflow `.github/workflows/*.yml` file

```yaml
uses: extenda/docker@v0
with:
  image: image-name
  registry: [aws-account-number].dkr.ecr.[region].amazonaws.com
env:
  AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
  AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```