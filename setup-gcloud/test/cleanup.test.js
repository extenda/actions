import * as core from '@actions/core';
import mockFs from 'mock-fs';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  cleanupCredentials,
  deleteCredentialFiles,
  deleteGcloudConfigDirectory,
  deleteJobScopedDirectory,
  getCredentialFilesFromState,
} from '../src/cleanup.js';

vi.mock('@actions/core');

describe('cleanup utilities', () => {
  let orgEnv;

  beforeEach(() => {
    vi.clearAllMocks();
    orgEnv = process.env;
    process.env = {
      ...orgEnv,
      RUNNER_TEMP: '/runner/temp',
      GITHUB_RUN_ID: '12345',
      GITHUB_RUN_ATTEMPT: '1',
      CLOUDSDK_CONFIG: '/runner/temp/gcloud-config-12345-1',
    };
  });

  afterEach(() => {
    process.env = orgEnv;
    mockFs.restore();
    vi.clearAllMocks();
  });

  describe('getCredentialFilesFromState', () => {
    test('returns parsed credential files when state exists', () => {
      core.getState.mockReturnValueOnce(JSON.stringify(['/tmp/a.json', '/tmp/b.json']));

      const files = getCredentialFilesFromState();

      expect(core.getState).toHaveBeenCalledWith('gcloud-credential-files');
      expect(files).toEqual(['/tmp/a.json', '/tmp/b.json']);
    });

    test('returns empty array when state is missing', () => {
      core.getState.mockReturnValueOnce('');

      const files = getCredentialFilesFromState();

      expect(files).toEqual([]);
    });
  });

  describe('deleteCredentialFiles', () => {
    test('deletes existing credential files', () => {
      const files = [
        '/runner/temp/setup-gcloud-12345-1/credential-uuid1.json',
        '/runner/temp/setup-gcloud-12345-1/credential-uuid2.json',
      ];

      mockFs({
        '/runner/temp/setup-gcloud-12345-1': {
          'credential-uuid1.json': 'cred1',
          'credential-uuid2.json': 'cred2',
        },
      });

      deleteCredentialFiles(files);

      expect(core.info).toHaveBeenCalledWith(
        expect.stringContaining('Deleted credential file'),
      );
    });

    test('handles missing files gracefully', () => {
      mockFs({
        '/runner/temp': {},
      });

      deleteCredentialFiles(['/runner/temp/missing.json']);

      expect(core.warning).not.toHaveBeenCalled();
    });

    test('handles missing files without error', () => {
      mockFs({
        '/runner/temp': {},
      });

      // Try to delete a non-existent file - should not warn
      deleteCredentialFiles(['/runner/temp/nonexistent/file.json']);

      expect(core.warning).not.toHaveBeenCalled();
      expect(core.info).not.toHaveBeenCalled();
    });
  });

  describe('deleteJobScopedDirectory', () => {
    test('deletes job-scoped directory', () => {
      mockFs({
        '/runner/temp/setup-gcloud-12345-1': {
          'credential-uuid1.json': 'data',
        },
      });

      deleteJobScopedDirectory();

      expect(core.info).toHaveBeenCalledWith(
        expect.stringContaining('Deleted job-scoped credential directory'),
      );
    });

    test('handles missing directory gracefully', () => {
      mockFs({
        '/runner/temp': {},
      });

      deleteJobScopedDirectory();

      expect(core.warning).not.toHaveBeenCalled();
    });
  });

  describe('deleteGcloudConfigDirectory', () => {
    test('deletes CLOUDSDK_CONFIG directory', () => {
      mockFs({
        '/runner/temp/gcloud-config-12345-1': {
          properties: 'config',
        },
      });

      deleteGcloudConfigDirectory();

      expect(core.info).toHaveBeenCalledWith(
        expect.stringContaining('Deleted CLOUDSDK_CONFIG directory'),
      );
    });

    test('skips when CLOUDSDK_CONFIG not set', () => {
      delete process.env.CLOUDSDK_CONFIG;

      mockFs({
        '/runner/temp': {},
      });

      deleteGcloudConfigDirectory();

      expect(core.info).not.toHaveBeenCalled();
    });
  });

  describe('cleanupCredentials', () => {
    test('performs all cleanup operations', () => {
      const credFiles = [
        '/runner/temp/setup-gcloud-12345-1/credential-uuid1.json',
      ];

      mockFs({
        '/runner/temp/setup-gcloud-12345-1': {
          'credential-uuid1.json': 'data',
        },
        '/runner/temp/gcloud-config-12345-1': {
          properties: 'config',
        },
      });

      cleanupCredentials(credFiles);

      expect(core.info).toHaveBeenCalledWith(
        expect.stringContaining('Deleted credential file'),
      );
      expect(core.info).toHaveBeenCalledWith(
        expect.stringContaining('Deleted job-scoped credential directory'),
      );
      expect(core.info).toHaveBeenCalledWith(
        expect.stringContaining('Deleted CLOUDSDK_CONFIG directory'),
      );
    });

    test('handles undefined credential files input', () => {
      mockFs({
        '/runner/temp': {},
      });

      cleanupCredentials(undefined);

      expect(core.warning).not.toHaveBeenCalled();
    });
  });
});
