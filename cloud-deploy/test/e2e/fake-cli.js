// Stands in for gcloud, docker, trivy and cosign in an emulated run of the
// action. It records every call and answers from the state file of the run.
//
// Cloud Run is modelled with one rule: a revision is active while a traffic
// target names it, also at 0%.
import fs from 'node:fs';

import yaml from 'yaml';

const [tool, ...args] = process.argv.slice(2);
const stateFile = process.env.EMULATED_STATE;
const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));

fs.appendFileSync(
  process.env.EMULATED_CLI_LOG,
  `${JSON.stringify({ tool, args, time: Date.now() })}\n`,
);

const print = (text) => process.stdout.write(`${text}\n`);
const isCommand = (...words) => words.every((word, i) => args[i] === word);
const hasArgument = (argument) => args.includes(argument);
const argumentAfter = (flag) => args[args.indexOf(flag) + 1];

const isActive = (revision) =>
  state.traffic.some((target) => target.revisionName === revision.name);

const listRevisions = () =>
  state.revisions.map((revision) => ({
    metadata: {
      name: revision.name,
      creationTimestamp: revision.creationTimestamp,
    },
    status: {
      conditions: [
        { type: 'Ready', status: 'True' },
        { type: 'Active', status: isActive(revision) ? 'True' : 'False' },
      ],
    },
  }));

// Cloud Deploy applies the manifest: Cloud Run creates a revision, and the
// traffic of the manifest replaces the traffic of the service.
const createRelease = () => {
  const manifest = fs.readFileSync('cloudrun-service.yaml', 'utf8');
  fs.writeFileSync('released-cloudrun-service.yaml', manifest);

  const { metadata, spec } = yaml.parse(manifest);
  const sequence = String(state.revisions.length + 1).padStart(5, '0');
  const revision = {
    name: `${metadata.name}-${sequence}-new`,
    creationTimestamp: new Date().toISOString(),
  };
  state.revisions.unshift(revision);
  state.traffic = spec.traffic.map((target) =>
    target.latestRevision ? { ...target, revisionName: revision.name } : target,
  );
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
};

const gcloud = () => {
  if (isCommand('auth', 'print-identity-token')) {
    print('fake-id-token');
  } else if (isCommand('run', 'revisions', 'list')) {
    if (hasArgument('--format=json')) {
      print(JSON.stringify(listRevisions()));
    } else {
      print(state.revisions[0]?.name ?? '');
    }
  } else if (isCommand('run', 'revisions', 'delete')) {
    state.revisions = state.revisions.filter(({ name }) => name !== args[3]);
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
  } else if (isCommand('run', 'services', 'describe')) {
    if (state.revisions.length === 0) {
      process.stderr.write(
        `ERROR: (gcloud.run.services.describe) Cannot find service [${args[3]}]\n`,
      );
      process.exit(1);
    }
    print(JSON.stringify({ status: { traffic: state.traffic } }));
  } else if (isCommand('deploy', 'releases', 'create')) {
    createRelease();
  } else if (isCommand('deploy', 'rollouts', 'list')) {
    if (state.rollout === 'never-ends') {
      // Keep the job waiting, as a rollout does while the job is cancelled.
      setInterval(() => {}, 1000);
    } else {
      print(state.rollout);
    }
  }
};

const docker = () => {
  if (isCommand('buildx', 'imagetools', 'inspect')) {
    if (hasArgument('--raw')) {
      print(JSON.stringify({ schemaVersion: 2, config: {}, layers: [] }));
    } else {
      print(JSON.stringify(`sha256:${'a'.repeat(64)}`));
    }
  }
};

const trivy = () => {
  const output = argumentAfter('--output');
  const report = hasArgument('json') ? { Results: [] } : {};
  fs.writeFileSync(output, JSON.stringify(report));
};

const tools = { gcloud, docker, trivy, cosign: () => {} };
tools[tool]();
