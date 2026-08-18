import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
vi.mock('@actions/core');
vi.mock('setup-gcloud/src/index.js');

import * as core from '@actions/core';
import mockFs from 'mock-fs';
import nock from 'nock';
import { getIdToken, setupGcloud } from 'setup-gcloud/src/index.js';

import action from '../src/index.js';

const STAGING_URL = 'https://translation.retailsvc.dev';
const PROD_URL = 'https://translation.retailsvc.com';
const RESOLVED_PATH = '/api/v1/modules/pos/translations/en-US';
const PUT_PATH = '/api/v1/modules/pos/translations/en-US/layers/default';

const entries = {
  'app.title': {
    value: 'Point of Sale',
    description: 'Application title',
  },
  'app.greeting': {
    value: 'Hello, {name}',
    description: 'Greeting shown after sign-in',
    parameters: ['name'],
  },
};

const setInputs = (overrides = {}) => {
  const inputs = {
    'service-account-key': 'sa-key',
    'module-id': 'pos',
    environment: 'staging',
    path: 'translations/',
    'api-url': '',
    'dry-run': 'false',
    ...overrides,
  };
  core.getInput.mockImplementation((name) => inputs[name] ?? '');
  core.getBooleanInput.mockImplementation((name) => inputs[name] === 'true');
};

const mockResolvedGet = (status, body, baseUrl = STAGING_URL) =>
  nock(baseUrl).get(RESOLVED_PATH).reply(status, body);

const mockPut = (status, body, baseUrl = STAGING_URL) =>
  nock(baseUrl)
    .put(PUT_PATH, { entries })
    .matchHeader('authorization', 'Bearer mock-id-token')
    .reply(status, body);

describe('action', () => {
  beforeAll(() => {
    nock.disableNetConnect();
  });

  afterAll(() => {
    nock.enableNetConnect();
  });

  beforeEach(() => {
    setInputs();
    setupGcloud.mockResolvedValue('project-id');
    getIdToken.mockResolvedValue('mock-id-token');
    mockFs({ 'translations/en-US.json': JSON.stringify(entries) });
  });

  afterEach(() => {
    mockFs.restore();
    nock.cleanAll();
    vi.clearAllMocks();
  });

  it('publishes a flat file when the module has no translations yet', async () => {
    mockResolvedGet(404, { message: 'Not Found' });
    const put = mockPut(201);

    await action();

    expect(put.isDone()).toEqual(true);
    expect(getIdToken).toHaveBeenCalledWith('trs.translation-api');
    expect(core.info).toHaveBeenCalledWith(
      `Created the default layer for pos on ${STAGING_URL}.`,
    );
  });

  it('unwraps a file already wrapped in an entries object', async () => {
    mockFs({ 'translations/en-US.json': JSON.stringify({ entries }) });
    mockResolvedGet(404, { message: 'Not Found' });
    const put = mockPut(200);

    await action();

    expect(put.isDone()).toEqual(true);
    expect(core.info).toHaveBeenCalledWith(
      `Replaced the default layer for pos on ${STAGING_URL}.`,
    );
  });

  // A flat file may hold a key literally named `entries`; only an exactly-wrapped publish
  // body is unwrapped, or that one entry's fields would be published as the whole layer.
  it('publishes a flat file that has an entries key of its own', async () => {
    const flat = {
      entries: { value: 'Entries', description: 'Tab label' },
      'app.title': { value: 'Point of Sale' },
    };
    mockFs({ 'translations/en-US.json': JSON.stringify(flat) });
    mockResolvedGet(404, { message: 'Not Found' });
    const put = nock(STAGING_URL)
      .put(PUT_PATH, { entries: flat })
      .matchHeader('authorization', 'Bearer mock-id-token')
      .reply(201);

    await action();

    expect(put.isDone()).toEqual(true);
  });

  it('publishes when the current translations cannot be read', async () => {
    mockResolvedGet(502, { message: 'Bad Gateway' });
    const put = mockPut(201);

    await action();

    expect(put.isDone()).toEqual(true);
    expect(core.warning).toHaveBeenCalledWith(
      expect.stringContaining('Could not read the current translations'),
    );
  });

  // A reusable workflow forwarding an unset input sends an empty string, which
  // core.getBooleanInput rejects outright.
  it('treats an empty dry-run input as false', async () => {
    setInputs({ 'dry-run': '' });
    mockResolvedGet(404, { message: 'Not Found' });
    const put = mockPut(201);

    await action();

    expect(put.isDone()).toEqual(true);
  });

  it('fails locally on a wrapped file with no entries', async () => {
    mockFs({ 'translations/en-US.json': JSON.stringify({ entries: {} }) });

    await expect(action()).rejects.toThrow('no translation entries found');
  });

  it('skips the publish when resolved translations are unchanged', async () => {
    mockResolvedGet(200, {
      module: 'pos',
      langTag: 'en-US',
      layer: 'resolved',
      entries,
    });

    await action();

    expect(setupGcloud).not.toHaveBeenCalled();
    expect(core.info).toHaveBeenCalledWith(
      `Translations for pos are unchanged on ${STAGING_URL}. Skipping publish.`,
    );
  });

  it('publishes when resolved translations differ', async () => {
    mockResolvedGet(200, {
      module: 'pos',
      langTag: 'en-US',
      layer: 'resolved',
      entries: { 'app.title': { value: 'Old title' } },
    });
    const put = mockPut(200);

    await action();

    expect(put.isDone()).toEqual(true);
  });

  it('reports all validation errors on 422', async () => {
    mockResolvedGet(404, { message: 'Not Found' });
    mockPut(422, {
      message: ['entries.app.title.value is too long', 'unknown parameter'],
    });

    await expect(action()).rejects.toThrow(
      'Translation validation failed with 2 error(s):\n' +
        'entries.app.title.value is too long\nunknown parameter',
    );
  });

  it('fails on unexpected response status', async () => {
    mockResolvedGet(404, { message: 'Not Found' });
    mockPut(500, { message: 'Internal Server Error' });

    await expect(action()).rejects.toThrow(
      'Translation Service publish failed: [500] - {"message":"Internal Server Error"}',
    );
  });

  it('does not publish or authenticate on dry-run', async () => {
    setInputs({ 'dry-run': 'true' });
    mockResolvedGet(404, { message: 'Not Found' });

    await action();

    expect(setupGcloud).not.toHaveBeenCalled();
    expect(core.info).toHaveBeenCalledWith(
      `Dry run: would publish the default layer for pos to ${STAGING_URL}.`,
    );
  });

  it('reports the skip a real run would take on dry-run', async () => {
    setInputs({ 'dry-run': 'true' });
    mockResolvedGet(200, {
      module: 'pos',
      langTag: 'en-US',
      layer: 'resolved',
      entries,
    });

    await action();

    expect(setupGcloud).not.toHaveBeenCalled();
    expect(core.info).toHaveBeenCalledWith(
      `Dry run: translations for pos are unchanged on ${STAGING_URL}. A real run would skip the publish.`,
    );
  });

  // A caller that omits the input, or a reusable workflow that forwards an unset one,
  // publishes to prod: staging exists for Translation Service development alone.
  it('publishes to prod when no environment is given', async () => {
    setInputs({ environment: '' });
    mockResolvedGet(404, { message: 'Not Found' }, PROD_URL);
    const put = mockPut(201, undefined, PROD_URL);

    await action();

    expect(put.isDone()).toEqual(true);
  });

  it('maps the prod environment to the prod host', async () => {
    setInputs({ environment: 'prod' });
    mockResolvedGet(404, { message: 'Not Found' }, PROD_URL);
    const put = mockPut(201, undefined, PROD_URL);

    await action();

    expect(put.isDone()).toEqual(true);
  });

  it('prefers api-url over the environment mapping', async () => {
    const override = 'https://translation.custom.example';
    setInputs({ 'api-url': `${override}/` });
    mockResolvedGet(404, { message: 'Not Found' }, override);
    const put = mockPut(201, undefined, override);

    await action();

    expect(put.isDone()).toEqual(true);
  });

  it('fails on an unknown environment', async () => {
    setInputs({ environment: 'qa' });

    await expect(action()).rejects.toThrow(
      "Invalid environment 'qa'. Expected one of: staging, prod",
    );
  });

  it('fails clearly when en-US.json is missing', async () => {
    mockFs({});

    await expect(action()).rejects.toThrow(
      'Translation file not found: translations/en-US.json. ' +
        'The default layer only accepts en-US, so the path must contain the file en-US.json.',
    );
  });
});
