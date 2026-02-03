import fs from 'fs';

import {
  commentOutSourceUrl,
  generateRegexPattern,
  parseNugetSourceJson,
} from '../src/nuget-sources.js';

const nugetSorce = `[{
  "name": "nuget.org",
  "source": "https://api.nuget.org/v3/index.json"
},
{
  "name": "Extenda",
  "source": "https://repo.extendaretail.com/repository/nuget-group/",
  "username": "MyUser",
  "password": "MyPwd",
  "apikey": "MyKey"
}]`;

const nugetXml = `<?xml version="1.0" encoding="utf-8"?>
    <configuration>
      <solution>
        <add key="disableSourceControlIntegration" value="true" />
      </solution>
      <packageSources>
          <add key="RS (Nexus)" value="https://repo.extendaretail.com/repository/nuget-group/" />
        <add key="test" value="test value" />
          <add key="nuget.org-proxy" value="https://repo.extendaretail.com/repository/nuget-group/" />
      </packageSources>
      <packageSourceCredentials />
      <activePackageSource>
        <add key="All" value="(Aggregate source)" />
      </activePackageSource>
      <packageSourceCredentials />
      <disabledPackageSources />
    </configuration>`;

describe('Setup Nuget Sources tests', () => {
  beforeAll(() => {
    fs.writeFileSync(`${__dirname}/NuGet-test.config`, nugetXml, {
      encoding: 'utf8',
      flag: 'w',
    });
  });

  test('Generate regex from url', () => {
    expect(
      generateRegexPattern(
        'https://repo.extendaretail.com/repository/nuget-group/',
      ),
    ).toEqual(
      /^\s*(.*"https:\/\/repo.extendaretail.com\/repository\/nuget-group\/\/?"\s*\/>)$/gm,
    );
    expect(
      generateRegexPattern(
        'https://repo.extendaretail.com/repository/nuget-group',
      ),
    ).toEqual(
      /^\s*(.*"https:\/\/repo.extendaretail.com\/repository\/nuget-group\/?"\s*\/>)$/gm,
    );
    expect(generateRegexPattern('https://api.nuget.org/v3/index.json')).toEqual(
      /^\s*(.*"https:\/\/api.nuget.org\/v3\/index.json\/?"\s*\/>)$/gm,
    );
    expect(generateRegexPattern(null)).toEqual(null);
  });

  test('Comment out existing repo URLs', async () => {
    expect.assertions(2);
    return commentOutSourceUrl(
      `${__dirname}/NuGet-test.config`,
      /^\s*(.*"https:\/\/repo.extendaretail.com\/repository\/nuget-group\/\/?"\s*\/>)$/gm,
    ).then((result) => {
      expect(result.length).toEqual(1);
      expect(result[0].hasChanged).toEqual(true);
    });
  });

  test('Parsing NuGet source JSON', () => {
    const result = parseNugetSourceJson(nugetSorce);

    expect(result[0].name).toEqual('nuget.org');
    expect(result[0].username).toEqual(undefined);

    expect(result[1].name).toEqual('Extenda');
    expect(result[1].username).toEqual('MyUser');
    expect(result[1].password).toEqual('MyPwd');
    expect(result[1].apikey).toEqual('MyKey');
  });
});
