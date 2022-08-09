const github = require('@actions/github');
const core = require('@actions/core');
const crowdinClient = require('./auth');
const { getProjectId } = require('./handle-project');

const decodeFileContentB64 = (content) => {
  const buff = Buffer.from(content, 'base64');
  return buff.toString('utf-8');
};

const getFilesContent = async (githubToken, reposList) => {
  const owner = 'extenda';
  const octokit = github.getOctokit(githubToken);

  const inputPaths = reposList.map((path) => path.paths);

  const inputPathsFlat = [].concat(...inputPaths);
  const result = {};

  const inputPathsRegexStrRegexp = new RegExp(
    // eslint-disable-next-line
    '^' + inputPathsFlat.join('|').replaceAll('/', '\/').replaceAll('*', '.*') + '$',
  );

  await Promise.all(reposList.map(async (repository) => {
    const getTreeResp = await octokit.git.getTree({
      owner,
      repo: repository.repo,
      tree_sha: 'master',
      recursive: true,
    });

    const allFilePaths = getTreeResp.data.tree.map((file) => file.path);

    const pathsForTranslation = allFilePaths.filter(
      (filePath) => filePath.match(inputPathsRegexStrRegexp) != null,
    );

    await Promise.all(pathsForTranslation.map(async (path) => {
      const getContentResp = await octokit.repos.getContent({
        owner,
        repo: repository.repo,
        path,
      });
      if (getContentResp.data.content !== undefined) {
        // eslint-disable-next-line
        result[repository['service-name'] + ':' + path] = getContentResp.data.content;
      }
    }));
  }));
  return result;
};

const uploadFiles = async (githubToken, crowdinToken, spec) => {
  const {
    uploadStorageApi,
    sourceFilesApi,
  } = await crowdinClient(crowdinToken);

  const {
    repositories: reposList,
  } = spec;

  const projectId = await getProjectId(crowdinToken, spec);

  const filesContent = await getFilesContent(githubToken, reposList);

  // Get list of existing directories in Crowdin
  // We use this to create directories that are defined in translations.yaml but are missing in
  // Crowdin and prevents trying to create directories again that already exist
  const dirList = await sourceFilesApi.listProjectDirectories(projectId);

  // Construct a map of directory names to Crowdin directory ids
  const dirNameToId = {};
  dirList.data.forEach((obj) => {
    dirNameToId[obj.data.name] = obj.data.id;
  });

  // Create directories synchronously because Crowdin returns a response
  // when the folder is scheduled for creation and not when it has actually been created
  /* eslint-disable no-undef */
  /* eslint-disable no-await-in-loop */
  for ([fileName] of Object.entries(filesContent)) {
    const directory = fileName.split(':')[0];
    /* eslint-enable no-undef */
    if (!(directory in dirNameToId)) {
      await sourceFilesApi.createDirectory(projectId, { name: directory })
        .then((dirResp) => {
          dirNameToId[directory] = dirResp.data.id;
        }).catch((err) => {
          core.error(err);
        });
      /* eslint-enable no-await-in-loop */
    }
  }

  const listFilesInProject = await sourceFilesApi.listProjectFiles(projectId);

  const listPathsInProject = listFilesInProject.data.map((filePathProj) => filePathProj.data.path);

  // All relevant directories now exist
  // Upload files to their respective directories
  // eslint-disable-next-line
  const pathRegex = new RegExp('^(?:.+\/)*(.+\..+)$');
  Object.entries(filesContent).forEach(async ([fileName, data]) => {
    const [directoryName, fullFilePath] = fileName.split(':');

    const directoryId = dirNameToId[directoryName];
    const filePath = fullFilePath.match(pathRegex)[1];

    const fileData = decodeFileContentB64(data);
    const storage = await uploadStorageApi.addStorage(filePath, fileData);

    if (!listPathsInProject.includes(`/${directoryName}/${filePath}`)) {
      await sourceFilesApi.createFile(projectId, {
        directoryId,
        name: filePath,
        storageId: storage.data.id,
      });
    }
  });
};

module.exports = uploadFiles;
