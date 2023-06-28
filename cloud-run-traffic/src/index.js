const core = require("@actions/core");
const exec = require("@actions/exec");
const { run } = require("../../utils/src");
const setupGcloud = require("../../setup-gcloud/src/setup-gcloud");

async function execGCloud(args, options = {}) {
  let stdout = "";
  let stderr = "";

  core.info(`[running] gcloud "${args.join('" "')}"`);
  await exec.exec("gcloud", args, {
    silent: false,
    listeners: {
      stdout: (data) => {
        stdout += data.toString("utf8");
      },
      stderr: (data) => {
        stderr += data.toString("utf8");
      },
    },
  });

  if (stderr) {
    throw new Error(stderr);
  }

  return options.json ? JSON.parse(stdout) : stdout;
}

function validatePercentage(_percentage) {
  const percentage = +_percentage;

  if (isNaN(percentage) || percentage < 0 || percentage > 100) {
    throw new Error("Percentage must be a valid number between 0 and 100");
  }

  return percentage;
}

function getRevisionsList(service, projectId) {
  return execGCloud(
    [
      "run",
      "revisions",
      "list",
      `--service=${service}`,
      "--region=europe-west1",
      `--project=${projectId}`,
      "--format=json",
    ],
    { json: true }
  );
}

function routeTraffic(service, percentage, projectId) {
  return execGCloud(
    [
      "run",
      "services",
      "update-traffic",
      service,
      `--to-revisions=${targetRevision}=${percentage}`,
      "--region=europe-west1",
      `--project=${projectId}`,
    ],
    { json: true }
  );
}

async function action() {
  const serviceAccountKey = core.getInput("service-account-key", {
    required: true,
  });
  const service = core.getInput("service", { required: true });
  const targetRevision = core.getInput("target-revision", { required: true });
  const percentage = validatePercentage(
    core.getInput("percentage", { required: true }) || "100"
  );

  const projectId = await setupGcloud(
    serviceAccountKey,
    process.env.GCLOUD_INSTALLED_VERSION || "latest"
  );

  const revisions = await getRevisionsList(service, projectId);

  if (!revisions.sone(({ metadata }) => metadata.name === targetRevision)) {
    throw new Error(
      `Revision ${targetRevision} not found for service ${service}`
    );
  }

  await routeTraffic(service, percentage, projectId);
}

if (require.main === module) {
  run(action);
}

module.exports = action;
