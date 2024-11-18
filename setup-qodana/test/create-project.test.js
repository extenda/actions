const nock = require('nock');
const createProject = require('../src/create-project');

const orgEnv = process.env;

const mockQodana = (responseCode) =>
  nock('https://api.qodana.cloud')
    .post('/v1/organizations/teams/projects', {
      teamName: 'test',
      projectName: 'actions',
    })
    .matchHeader('authorization', 'Bearer qodana-token')
    .reply(responseCode, 'project-token');

beforeEach(() => {
  process.env = {
    GITHUB_REPOSITORY: 'extenda/actions',
    ...orgEnv,
  };
});

afterEach(() => {
  nock.cleanAll();
  process.env = orgEnv;
});

test('Create Qodana project', async () => {
  const qodanaCloud = mockQodana(201);
  const projectToken = await createProject('qodana-token', 'test');
  expect(projectToken).toEqual('project-token');
  expect(qodanaCloud.isDone()).toEqual(true);
});

test('Get token from existing Qodana project', async () => {
  const qodanaCloud = mockQodana(200);
  const projectToken = await createProject('qodana-token', 'test');
  expect(projectToken).toEqual('project-token');
  expect(qodanaCloud.isDone()).toEqual(true);
});

test('It uses QODANA_TOKEN from env if set', async () => {
  process.env.QODANA_TOKEN = 'env-token';
  const qodanaCloud = mockQodana(200);
  const projectToken = await createProject('qodana-token', 'test');
  expect(projectToken).toEqual('env-token');
  expect(qodanaCloud.isDone()).toEqual(false);
});
