import * as core from '@actions/core';
import axios from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import execGcloud from '../../src/utils/gcloud-output.js';
import getToken from '../../src/utils/identity-token.js';
import { setRetryDelay } from '../../src/utils/retry-until.js';
import supersedeCanary from '../../src/utils/supersede-canary.js';

// Only the exec and axios layers are mocked. The helpers, send-request and
// retry-until are real, driven by a fake Cloud Run and a fake platform API.
vi.mock('@actions/core');
vi.mock('axios');
vi.mock('google-auth-library');
vi.mock('../../src/utils/identity-token.js');
vi.mock('../../src/utils/gcloud-output.js');

const args = {
  service: 'svc',
  project: 'proj',
  region: 'europe-west1',
  supersededBy: 'abc1234',
};

let calls;
let run;

const condition = (active) => [
  { type: 'Active', status: active ? 'True' : 'False' },
];

/**
 * Build the fake world. `traffic` maps revision to percent, `revisions` is
 * the list of [name, creationTimestamp].
 */
const world = ({ traffic, revisions, deleteFails = false }) => {
  const state = {
    traffic: { ...traffic },
    revisions: [...revisions],
  };
  execGcloud.mockImplementation(async (a) => {
    const cmd = a.slice(0, 3).join(' ');
    calls.push(cmd);
    if (cmd === 'run services list') {
      return JSON.stringify([
        {
          metadata: { name: 'svc' },
          status: {
            traffic: Object.entries(state.traffic).map(([r, percent]) => ({
              revisionName: r,
              percent,
            })),
          },
        },
      ]);
    }
    if (cmd === 'run services update-traffic') {
      const target = a.find((x) => x.startsWith('--to-revisions=')).slice(15);
      const [name] = target.split('=');
      state.traffic = { [name]: 100 };
      return '';
    }
    if (cmd === 'run revisions list') {
      return JSON.stringify(
        state.revisions.map(([name, creationTimestamp]) => ({
          metadata: { name, creationTimestamp },
          status: { conditions: condition(state.traffic[name] > 0) },
        })),
      );
    }
    if (cmd === 'run revisions delete') {
      if (deleteFails) {
        throw new Error('delete boom');
      }
      state.revisions = state.revisions.filter(([n]) => n !== a[3]);
      return '';
    }
    throw new Error(`unexpected gcloud call ${cmd}`);
  });
  return state;
};

const apiCancels = (outcome) => {
  axios.post.mockImplementation(async () => {
    calls.push('api cancel');
    if (outcome.reject) {
      throw outcome.reject;
    }
    return { status: 200, data: outcome.data };
  });
};

const T1 = '2026-01-01T00:00:00Z';
const T2 = '2026-01-02T00:00:00Z';
const T3 = '2026-01-03T00:00:00Z';

describe('supersedeCanary (end to end with fake gcloud and API)', () => {
  beforeEach(() => {
    calls = [];
    run = () => supersedeCanary(args);
    setRetryDelay(1, 1000);
    getToken.mockResolvedValue('token');
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('75/25 with the record: cancels first, rolls back to previous_revision, deletes the canary', async () => {
    const state = world({
      traffic: { 'svc-1': 75, 'svc-2': 25 },
      revisions: [
        ['svc-1', T1],
        ['svc-2', T2],
      ],
    });
    apiCancels({
      data: {
        revision: 'svc-2',
        previous_revision: 'svc-1',
        status: 'cancelled',
      },
    });

    expect(await run()).toBe('svc-1');

    expect(state.traffic).toEqual({ 'svc-1': 100 });
    expect(state.revisions.map(([n]) => n)).toEqual(['svc-1']);
    expect(axios.post).toHaveBeenCalledWith(
      '/canary/automatic/svc/cancel',
      {
        project: 'proj',
        region: 'europe-west1',
        reason: 'superseded',
        supersededBy: 'abc1234',
      },
      expect.anything(),
    );
    // Cancel before any traffic change.
    expect(calls.indexOf('api cancel')).toBe(0);
    expect(calls.indexOf('api cancel')).toBeLessThan(
      calls.indexOf('run services update-traffic'),
    );
    expect(calls.indexOf('run services update-traffic')).toBeLessThan(
      calls.indexOf('run revisions delete'),
    );
    expect(core.warning).toHaveBeenCalledWith(
      expect.stringContaining('stable revision svc-1'),
    );
  });

  it('stale record (stable at 0%): falls back to the oldest serving revision', async () => {
    const state = world({
      traffic: { 'svc-0': 0, 'svc-1': 50, 'svc-2': 50 },
      revisions: [
        ['svc-0', T1],
        ['svc-1', T2],
        ['svc-2', T3],
      ],
    });
    apiCancels({
      data: {
        revision: 'svc-2',
        previous_revision: 'svc-0',
        status: 'cancelled',
      },
    });

    expect(await run()).toBe('svc-1');
    expect(state.traffic).toEqual({ 'svc-1': 100 });
    expect(state.revisions.map(([n]) => n).sort()).toEqual(['svc-0', 'svc-1']);
    expect(core.warning).toHaveBeenCalledWith(
      expect.stringContaining('does not match the live traffic'),
    );
  });

  it('valid record plus a third serving revision: fails without touching traffic', async () => {
    const state = world({
      traffic: { 'svc-1': 60, 'svc-2': 20, 'svc-3': 20 },
      revisions: [
        ['svc-1', T1],
        ['svc-2', T2],
        ['svc-3', T3],
      ],
    });
    apiCancels({
      data: {
        revision: 'svc-2',
        previous_revision: 'svc-1',
        status: 'cancelled',
      },
    });

    await expect(run()).rejects.toThrow('3 revisions serve traffic');
    expect(state.traffic).toEqual({ 'svc-1': 60, 'svc-2': 20, 'svc-3': 20 });
    expect(calls).not.toContain('run services update-traffic');
    expect(calls).not.toContain('run revisions delete');
  });

  it('record canary at 0% while another unnamed revision serves: stale, uses the fallback', async () => {
    const state = world({
      traffic: { 'svc-1': 50, 'svc-2': 0, 'svc-3': 50 },
      revisions: [
        ['svc-1', T1],
        ['svc-2', T2],
        ['svc-3', T3],
      ],
    });
    apiCancels({
      data: {
        revision: 'svc-2',
        previous_revision: 'svc-1',
        status: 'cancelled',
      },
    });

    expect(await run()).toBe('svc-1');
    expect(state.traffic).toEqual({ 'svc-1': 100 });
    // svc-3 (the unnamed serving revision) is the canary and is deleted.
    expect(state.revisions.map(([n]) => n).sort()).toEqual(['svc-1', 'svc-2']);
    expect(core.warning).toHaveBeenCalledWith(
      expect.stringContaining('does not match the live traffic'),
    );
  });

  it('50/50 with no record: the oldest serving revision is stable', async () => {
    const state = world({
      traffic: { 'svc-2': 50, 'svc-1': 50 },
      revisions: [
        ['svc-2', T2],
        ['svc-1', T1],
      ],
    });
    apiCancels({
      reject: {
        response: { status: 404, data: { code: 'NO_CANARY_IN_PROGRESS' } },
      },
    });

    expect(await run()).toBe('svc-1');
    expect(state.traffic).toEqual({ 'svc-1': 100 });
    expect(state.revisions.map(([n]) => n)).toEqual(['svc-1']);
  });

  it('fails without touching traffic when 3 revisions serve traffic', async () => {
    const state = world({
      traffic: { 'svc-1': 40, 'svc-2': 30, 'svc-3': 30 },
      revisions: [
        ['svc-1', T1],
        ['svc-2', T2],
        ['svc-3', T3],
      ],
    });
    apiCancels({
      reject: {
        response: { status: 404, data: { code: 'NO_CANARY_IN_PROGRESS' } },
      },
    });

    await expect(run()).rejects.toThrow('3 revisions serve traffic');
    expect(state.traffic).toEqual({ 'svc-1': 40, 'svc-2': 30, 'svc-3': 30 });
    expect(calls).not.toContain('run services update-traffic');
    expect(calls).not.toContain('run revisions delete');
  });

  it('cancel 404 after the canary was promoted: skips rollback and delete', async () => {
    const state = world({
      traffic: { 'svc-2': 100, 'svc-1': 0 },
      revisions: [
        ['svc-1', T1],
        ['svc-2', T2],
      ],
    });
    apiCancels({
      reject: {
        response: { status: 404, data: { code: 'NO_CANARY_IN_PROGRESS' } },
      },
    });

    expect(await run()).toBe('svc-2');
    expect(state.traffic).toEqual({ 'svc-2': 100, 'svc-1': 0 });
    expect(calls).not.toContain('run services update-traffic');
    expect(calls).not.toContain('run revisions delete');
  });

  it('cancel 404 while still split (re-run): rolls back with the fallback', async () => {
    const state = world({
      traffic: { 'svc-1': 80, 'svc-2': 20 },
      revisions: [
        ['svc-1', T1],
        ['svc-2', T2],
      ],
    });
    apiCancels({
      reject: {
        response: { status: 404, data: { code: 'NO_CANARY_IN_PROGRESS' } },
      },
    });

    expect(await run()).toBe('svc-1');
    expect(state.traffic).toEqual({ 'svc-1': 100 });
    expect(state.revisions.map(([n]) => n)).toEqual(['svc-1']);
  });

  it('a 404 without the code fails the deploy and changes nothing', async () => {
    const state = world({
      traffic: { 'svc-1': 80, 'svc-2': 20 },
      revisions: [
        ['svc-1', T1],
        ['svc-2', T2],
      ],
    });
    apiCancels({
      reject: { response: { status: 404, data: { message: 'Not Found' } } },
    });

    await expect(run()).rejects.toThrow('cancel endpoint not available');
    expect(state.traffic).toEqual({ 'svc-1': 80, 'svc-2': 20 });
    expect(calls).toEqual(['api cancel']);
  });

  it('a cancel failure aborts before any traffic change', async () => {
    world({
      traffic: { 'svc-1': 80, 'svc-2': 20 },
      revisions: [
        ['svc-1', T1],
        ['svc-2', T2],
      ],
    });
    apiCancels({ reject: new Error('500') });

    await expect(run()).rejects.toThrow('Failed to cancel automatic canary');
    expect(calls).toEqual(['api cancel']);
  });

  it('refuses to delete a canary that still serves traffic after the shift', async () => {
    world({
      traffic: { 'svc-1': 75, 'svc-2': 25 },
      revisions: [
        ['svc-1', T1],
        ['svc-2', T2],
      ],
    });
    apiCancels({
      data: {
        revision: 'svc-2',
        previous_revision: 'svc-1',
        status: 'cancelled',
      },
    });
    // After the wait, a concurrent change gives the canary traffic again.
    let listCalls = 0;
    const base = execGcloud.getMockImplementation();
    execGcloud.mockImplementation(async (a) => {
      const out = await base(a);
      if (a[1] === 'services' && a[2] === 'list') {
        listCalls += 1;
        // 1: initial read, 2: wait poll, 3: re-check before delete
        if (listCalls === 3) {
          return JSON.stringify([
            {
              metadata: { name: 'svc' },
              status: {
                traffic: [
                  { revisionName: 'svc-1', percent: 90 },
                  { revisionName: 'svc-2', percent: 10 },
                ],
              },
            },
          ]);
        }
      }
      return out;
    });

    await expect(run()).rejects.toThrow('still serves 10% traffic');
    expect(calls).not.toContain('run revisions delete');
  });

  it('a delete that finds the revision already gone counts as success', async () => {
    const state = world({
      traffic: { 'svc-1': 75, 'svc-2': 25 },
      revisions: [
        ['svc-1', T1],
        ['svc-2', T2],
      ],
    });
    apiCancels({
      data: {
        revision: 'svc-2',
        previous_revision: 'svc-1',
        status: 'cancelled',
      },
    });
    // The canary revision disappears just before the delete runs.
    const base = execGcloud.getMockImplementation();
    execGcloud.mockImplementation(async (a) => {
      if (a[2] === 'delete') {
        state.revisions = state.revisions.filter(([n]) => n !== 'svc-2');
        throw new Error('NOT_FOUND');
      }
      return base(a);
    });

    expect(await run()).toBe('svc-1');
  });

  it('a real delete failure fails the deploy and says traffic is safe', async () => {
    const state = world({
      traffic: { 'svc-1': 75, 'svc-2': 25 },
      revisions: [
        ['svc-1', T1],
        ['svc-2', T2],
      ],
      deleteFails: true,
    });
    apiCancels({
      data: {
        revision: 'svc-2',
        previous_revision: 'svc-1',
        status: 'cancelled',
      },
    });

    await expect(run()).rejects.toThrow(
      /Traffic is safe on stable revision svc-1/,
    );
    expect(state.traffic).toEqual({ 'svc-1': 100 });
  });
});
