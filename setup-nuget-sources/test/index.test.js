import * as core from '@actions/core';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import action from '../src/index.js';
import * as nugetSources from '../src/nuget-sources.js';

vi.mock('@actions/core');
vi.mock('../src/nuget-sources.js');

describe('setup-nuget-sources action', () => {
  const mockConfigFile = 'NuGet.config';
  const mockSources = [
    {
      name: 'nuget.org',
      source: 'https://api.nuget.org/v3/index.json',
      username: undefined,
      password: undefined,
      apikey: undefined,
    },
    {
      name: 'Extenda',
      source: 'https://repo.extendaretail.com/repository/nuget-group/',
      username: 'testuser',
      password: 'testpass',
      apikey: 'testapikey',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    core.getInput.mockImplementation((name) => {
      if (name === 'config-file') return mockConfigFile;
      if (name === 'sources') return JSON.stringify(mockSources);
      return '';
    });
    core.info.mockImplementation(() => {});
    nugetSources.parseNugetSourceJson.mockReturnValue(mockSources);
    nugetSources.generateRegexPattern.mockReturnValue(/test-regex/gm);
    nugetSources.commentOutSourceUrl.mockResolvedValue([{ hasChanged: true }]);
    nugetSources.setNuGetSource.mockResolvedValue(undefined);
    nugetSources.setNuGetApiKey.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('should process sources without apikey', async () => {
    const sourcesWithoutApiKey = [
      {
        name: 'nuget.org',
        source: 'https://api.nuget.org/v3/index.json',
        username: undefined,
        password: undefined,
        apikey: undefined,
      },
    ];

    nugetSources.parseNugetSourceJson.mockReturnValue(sourcesWithoutApiKey);

    await action();

    expect(core.getInput).toHaveBeenCalledWith('config-file', {
      required: true,
    });
    expect(core.getInput).toHaveBeenCalledWith('sources');
    expect(nugetSources.parseNugetSourceJson).toHaveBeenCalledWith(
      JSON.stringify(mockSources),
    );
    expect(nugetSources.generateRegexPattern).toHaveBeenCalledWith(
      'https://api.nuget.org/v3/index.json',
    );
    expect(nugetSources.commentOutSourceUrl).toHaveBeenCalledWith(
      mockConfigFile,
      /test-regex/gm,
    );
    expect(nugetSources.setNuGetSource).toHaveBeenCalledWith(
      mockConfigFile,
      {
        name: 'nuget.org',
        source: 'https://api.nuget.org/v3/index.json',
      },
      { username: undefined, password: undefined },
    );
    expect(nugetSources.setNuGetApiKey).not.toHaveBeenCalled();
  });

  test('should process sources with apikey', async () => {
    await action();

    expect(core.getInput).toHaveBeenCalledWith('config-file', {
      required: true,
    });
    expect(core.getInput).toHaveBeenCalledWith('sources');
    expect(nugetSources.parseNugetSourceJson).toHaveBeenCalledWith(
      JSON.stringify(mockSources),
    );

    // Check that both sources were processed
    expect(nugetSources.generateRegexPattern).toHaveBeenCalledTimes(2);
    expect(nugetSources.commentOutSourceUrl).toHaveBeenCalledTimes(2);
    expect(nugetSources.setNuGetSource).toHaveBeenCalledTimes(2);

    // Check the first source (nuget.org)
    expect(nugetSources.generateRegexPattern).toHaveBeenNthCalledWith(
      1,
      'https://api.nuget.org/v3/index.json',
    );
    expect(nugetSources.setNuGetSource).toHaveBeenNthCalledWith(
      1,
      mockConfigFile,
      {
        name: 'nuget.org',
        source: 'https://api.nuget.org/v3/index.json',
      },
      { username: undefined, password: undefined },
    );

    // Check the second source (Extenda) with apikey
    expect(nugetSources.generateRegexPattern).toHaveBeenNthCalledWith(
      2,
      'https://repo.extendaretail.com/repository/nuget-group/',
    );
    expect(nugetSources.setNuGetSource).toHaveBeenNthCalledWith(
      2,
      mockConfigFile,
      {
        name: 'Extenda',
        source: 'https://repo.extendaretail.com/repository/nuget-group/',
      },
      { username: 'testuser', password: 'testpass' },
    );
    expect(nugetSources.setNuGetApiKey).toHaveBeenCalledWith(mockConfigFile, {
      apikey: 'testapikey',
      source: 'https://repo.extendaretail.com/repository/nuget-group/',
    });
  });

  test('should throw error when regex pattern generation fails', async () => {
    nugetSources.generateRegexPattern.mockReturnValue(null);

    await expect(action()).rejects.toThrow(
      'Could not generate regex pattern for https://api.nuget.org/v3/index.json',
    );

    expect(nugetSources.generateRegexPattern).toHaveBeenCalledWith(
      'https://api.nuget.org/v3/index.json',
    );
    expect(nugetSources.commentOutSourceUrl).not.toHaveBeenCalled();
    expect(nugetSources.setNuGetSource).not.toHaveBeenCalled();
  });

  test('should log all steps correctly', async () => {
    await action();

    const infoMessages = core.info.mock.calls.map((call) => call[0]);

    expect(infoMessages).toContain('Parsing nuget source JSON - PENDING');
    expect(infoMessages).toContain('Parsing nuget source JSON - SUCCESS');
    expect(infoMessages).toContain(
      `sources JSON: ${JSON.stringify(mockSources)}`,
    );
    expect(infoMessages).toContain('Generating regex pattern - PENDING');
    expect(infoMessages).toContain('Generating regex pattern - SUCCESS');
    expect(infoMessages).toContain(
      'Commenting out existing nuget source - PENDING',
    );
    expect(infoMessages).toContain('Set nuget source - PENDING');
    expect(infoMessages).toContain('Set nuget source - SUCCESS');
    expect(infoMessages).toContain('Set nuget source api-key - PENDING');
    expect(infoMessages).toContain('Set nuget source api-key - SUCCESS');
  });

  test('should handle multiple sources sequentially', async () => {
    const multipleSources = [
      {
        name: 'source1',
        source: 'https://source1.com',
        username: 'user1',
        password: 'pass1',
        apikey: 'key1',
      },
      {
        name: 'source2',
        source: 'https://source2.com',
        username: 'user2',
        password: 'pass2',
        apikey: 'key2',
      },
      {
        name: 'source3',
        source: 'https://source3.com',
        username: undefined,
        password: undefined,
        apikey: undefined,
      },
    ];

    nugetSources.parseNugetSourceJson.mockReturnValue(multipleSources);

    await action();

    expect(nugetSources.generateRegexPattern).toHaveBeenCalledTimes(3);
    expect(nugetSources.commentOutSourceUrl).toHaveBeenCalledTimes(3);
    expect(nugetSources.setNuGetSource).toHaveBeenCalledTimes(3);
    expect(nugetSources.setNuGetApiKey).toHaveBeenCalledTimes(2); // Only for sources with apikey

    // Verify first source
    expect(nugetSources.setNuGetSource).toHaveBeenNthCalledWith(
      1,
      mockConfigFile,
      { name: 'source1', source: 'https://source1.com' },
      { username: 'user1', password: 'pass1' },
    );
    expect(nugetSources.setNuGetApiKey).toHaveBeenNthCalledWith(
      1,
      mockConfigFile,
      { apikey: 'key1', source: 'https://source1.com' },
    );

    // Verify second source
    expect(nugetSources.setNuGetSource).toHaveBeenNthCalledWith(
      2,
      mockConfigFile,
      { name: 'source2', source: 'https://source2.com' },
      { username: 'user2', password: 'pass2' },
    );
    expect(nugetSources.setNuGetApiKey).toHaveBeenNthCalledWith(
      2,
      mockConfigFile,
      { apikey: 'key2', source: 'https://source2.com' },
    );

    // Verify third source (no apikey)
    expect(nugetSources.setNuGetSource).toHaveBeenNthCalledWith(
      3,
      mockConfigFile,
      { name: 'source3', source: 'https://source3.com' },
      { username: undefined, password: undefined },
    );
  });

  test('should log comment out result', async () => {
    const commentResult = [{ hasChanged: true, file: 'test.config' }];
    nugetSources.commentOutSourceUrl.mockResolvedValue(commentResult);

    await action();

    expect(core.info).toHaveBeenCalledWith(
      `Commenting out existing nuget source result: ${JSON.stringify(commentResult)}`,
    );
  });

  test('should handle empty sources array', async () => {
    nugetSources.parseNugetSourceJson.mockReturnValue([]);

    await action();

    expect(nugetSources.parseNugetSourceJson).toHaveBeenCalled();
    expect(nugetSources.generateRegexPattern).not.toHaveBeenCalled();
    expect(nugetSources.commentOutSourceUrl).not.toHaveBeenCalled();
    expect(nugetSources.setNuGetSource).not.toHaveBeenCalled();
    expect(nugetSources.setNuGetApiKey).not.toHaveBeenCalled();
  });
});
