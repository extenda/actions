# utils

This package contains utilities reusable in the actions implemented in this monorepo.

## Usage

### `checkEnv()`

Use this function to check that required environment variables are set prior to executing the action.

```javascript
const { checkEnv } = require('../../utils');

const run = async () => {
  checkEnv(['NEXUS_USERNAME', 'NEXUS_PASSWORD']);
}
```
This method throws an error if any of the provided variables are missing.

### `versions`

A collection of functions to read and manipulate versions according to 
[conventional commits](https://conventionalcommits.org).

Note that this script is not part of the `utils` main script and must be included from the `src` file. The reason for 
this is that it adds a lot of footprint to compiled scripts when used.

#### `async getBuildVersion(versionSuffix = '')`

Returns a promise with the version to build. This version number is determined by the last release number and the 
[conventional commits](https://conventionalcommits.org) after that release.

This method can append an optional suffix to the version, for example `-SNAPSHOT`.

```javascript
const versions = require('../../utils/src/versions');

const run = async () => { 
  const snapshotBuild = await getBuildVersion('-SNAPSHOT');
};
```

#### `async getChangelog(version)`

Returns a promise with a markdown formatted changelog for all conventional changes from the last release up until this 
commit.

```javascript
const versions = require('../../utils/src/versions');

const run = async () => { 
  const snapshotBuild = await getBuildVersion('-SNAPSHOT');
  const changes = await getChangelog(snapshotBuild);
};
```

#### `async getLatestRelease()`

Returns a promise with the latest tagged release matching the tag prefix.

```javascript
const { getLatestRelease } = require('../../.utils/src/versions');
const run = async () => {
  const latestRelease = await getLatestRelease();
};
```

#### `tagPrefix`

The tag prefix used for releases.

```javascript
const versions = require('../../utils/src/versions');
versions.tagPrefix = 'custom-';
```

#### `async tagReleaseVersion()` 

Create a release tag and push it to origin. This function returns a promise with an object containing a markdown 
formatted `changelog`, the `tagName` and the `version`. 

```javascript
const { tagReleaseVersion } = require('../../.utils/src/versions');

const run = async () => {
  const release = await tagReleaseVersion();
  console.log('Tag name', release.tagName);
  console.log('Release version', release.version);
  console.log('Changes', release.changelog);
}
```
