import { afterEach, describe, expect, test, vi } from 'vitest';

vi.mock('@actions/core');
vi.mock('../../setup-gcloud/src/exec-gcloud.js');

import * as core from '@actions/core';

import { execGcloud } from '../../setup-gcloud/src/exec-gcloud.js';
import { deleteSkills } from '../src/delete-skills.js';

const GCS = 'gs://extenda-agent-artifacts';
const FLAGS = ['--location=eu', '--project=extenda'];
const SKILL = 'private-platform-old-skill';
const describeCmd = [
  'alpha',
  'agent-registry',
  'skills',
  'describe',
  SKILL,
  ...FLAGS,
  '--format=value(defaultRevision.basename())',
  '--quiet',
];
const listCmd = [
  'alpha',
  'agent-registry',
  'skills',
  'revisions',
  'list',
  `--skill=${SKILL}`,
  ...FLAGS,
  '--format=value(name.basename())',
  '--quiet',
];
const revisionDelete = (rev) => [
  'alpha',
  'agent-registry',
  'skills',
  'revisions',
  'delete',
  rev,
  `--skill=${SKILL}`,
  ...FLAGS,
  '--quiet',
];
const skillDelete = [
  'alpha',
  'agent-registry',
  'skills',
  'delete',
  SKILL,
  ...FLAGS,
  '--quiet',
];
const gcsRm = ['storage', 'rm', '-r', `${GCS}/skills/platform-old-skill/`];

// Fake gcloud: describe returns the default revision, list returns revisions; `fail` maps a command to an error.
const fakeGcloud = ({
  defaultRevision = 'v0-02',
  revisions = ['v0-01', 'v0-02'],
  fail = [],
} = {}) => {
  execGcloud.mockImplementation(async (args) => {
    const key = args.join(' ');
    const failure = fail.find(([cmd]) => cmd.join(' ') === key);
    if (failure) throw new Error(failure[1]);
    if (key === describeCmd.join(' ')) return defaultRevision;
    if (key === listCmd.join(' ')) return revisions.join('\n');
    return '';
  });
};
const calls = () => execGcloud.mock.calls.map((c) => c[0]);

afterEach(() => vi.resetAllMocks());

describe('deleteSkills', () => {
  test('deletes revisions (default last) before the skill, then the GCS prefix', async () => {
    fakeGcloud({ defaultRevision: 'v0-01', revisions: ['v0-01', 'v0-02'] });
    expect(await deleteSkills(['old-skill'], false, 'platform')).toEqual([
      'old-skill',
    ]);
    expect(calls()).toEqual([
      describeCmd,
      listCmd,
      revisionDelete('v0-02'),
      revisionDelete('v0-01'),
      skillDelete,
      gcsRm,
    ]);
  });

  test('handles a skill with zero revisions', async () => {
    fakeGcloud({ defaultRevision: '', revisions: [] });
    await deleteSkills(['old-skill'], false, 'platform');
    expect(calls()).toEqual([describeCmd, listCmd, skillDelete, gcsRm]);
  });

  test('tolerates a revision that is already gone', async () => {
    fakeGcloud({
      fail: [
        [
          revisionDelete('v0-01'),
          "NOT_FOUND: Resource 'projects/extenda/locations/eu/skills/private-platform-old-skill/revisions/v0-01' was not found.",
        ],
      ],
    });
    await expect(
      deleteSkills(['old-skill'], false, 'platform'),
    ).resolves.toEqual(['old-skill']);
    expect(calls()).toContainEqual(skillDelete);
  });

  test('skips revisions but still removes GCS when the skill is not found', async () => {
    fakeGcloud({
      fail: [
        [
          describeCmd,
          "NOT_FOUND: Resource 'projects/extenda/locations/eu/skills/private-platform-old-skill' was not found.",
        ],
      ],
    });
    await deleteSkills(['old-skill'], false, 'platform');
    expect(calls()).toEqual([describeCmd, gcsRm]);
  });

  test('a non-not-found revision failure stops the skill delete and rethrows', async () => {
    fakeGcloud({ fail: [[revisionDelete('v0-01'), 'PERMISSION_DENIED']] });
    await expect(
      deleteSkills(['old-skill'], false, 'platform'),
    ).rejects.toThrow('PERMISSION_DENIED');
    expect(calls()).not.toContainEqual(skillDelete);
    expect(calls()).not.toContainEqual(gcsRm);
  });

  test('tolerates a GCS prefix that no longer exists', async () => {
    fakeGcloud({
      fail: [
        [
          gcsRm,
          'The following URLs matched no objects or files:\ngs://extenda-agent-artifacts/skills/platform-old-skill/',
        ],
      ],
    });
    await expect(
      deleteSkills(['old-skill'], false, 'platform'),
    ).resolves.toEqual(['old-skill']);
  });

  test('rethrows FAILED_PRECONDITION when the skill still has revisions', async () => {
    fakeGcloud({
      fail: [
        [
          skillDelete,
          'FAILED_PRECONDITION: cannot delete skill as it contains one or more revisions',
        ],
      ],
    });
    await expect(
      deleteSkills(['old-skill'], false, 'platform'),
    ).rejects.toThrow('FAILED_PRECONDITION');
    expect(calls()).not.toContainEqual(gcsRm);
  });

  test('rethrows other skill delete errors', async () => {
    fakeGcloud({ fail: [[skillDelete, 'PERMISSION_DENIED']] });
    await expect(
      deleteSkills(['old-skill'], false, 'platform'),
    ).rejects.toThrow('PERMISSION_DENIED');
  });

  test('dry-run warns and continues when the registry cannot be read', async () => {
    fakeGcloud({ fail: [[describeCmd, 'PERMISSION_DENIED']] });
    await expect(
      deleteSkills(['old-skill'], true, 'platform'),
    ).resolves.toEqual(['old-skill']);
    expect(core.warning).toHaveBeenCalledWith(
      expect.stringContaining('PERMISSION_DENIED'),
    );
  });

  test('non dry-run still rethrows when the registry cannot be read', async () => {
    fakeGcloud({ fail: [[listCmd, 'PERMISSION_DENIED']] });
    await expect(
      deleteSkills(['old-skill'], false, 'platform'),
    ).rejects.toThrow('PERMISSION_DENIED');
  });

  test('does nothing when there are no deleted skills', async () => {
    expect(await deleteSkills([], false, 'platform')).toEqual([]);
    expect(execGcloud).not.toHaveBeenCalled();
  });

  test('refuses when clan is empty', async () => {
    expect(await deleteSkills(['old-skill'], false, '')).toEqual([]);
    expect(execGcloud).not.toHaveBeenCalled();
  });

  test('dry-run lists revisions and deletes nothing', async () => {
    fakeGcloud();
    await deleteSkills(['old-skill'], true, 'platform');
    expect(calls()).toEqual([describeCmd, listCmd]);
    expect(core.info).toHaveBeenCalledWith(
      `[dry-run] Would delete revision ${SKILL}@v0-01`,
    );
    expect(core.info).toHaveBeenCalledWith(
      `[dry-run] Would delete revision ${SKILL}@v0-02`,
    );
    expect(core.info).toHaveBeenCalledWith(
      expect.stringContaining(`[dry-run] Would delete skill ${SKILL}`),
    );
  });
});
