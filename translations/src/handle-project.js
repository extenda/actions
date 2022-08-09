const crowdinClient = require('./auth');

const createProject = async (crowdinToken, spec) => {
  const {
    projectsGroupsApi,
  } = await crowdinClient(crowdinToken);

  const {
    'source-language': sourceLanguageId = 'en',
    'template-id': templateId = 1,
    'glossary-access': glossaryAccess = true,
    'target-languages': targetLanguageIds,
    'translate-duplicates': translateDuplicates = 4,
    name,
    description = '',
  } = spec;

  await projectsGroupsApi.addProject({
    sourceLanguageId,
    templateId,
    name,
    glossaryAccess,
    targetLanguageIds,
    translateDuplicates,
    description,
  });
};

const getProjectId = async (crowdinToken, spec) => {
  const {
    projectsGroupsApi,
  } = await crowdinClient(crowdinToken);

  const {
    name,
  } = spec;

  const projects = (await projectsGroupsApi.listProjects()).data;
  const projectNamesToIds = {};
  projects.forEach((project) => {
    projectNamesToIds[project.data.name] = project.data.id;
  });

  return projectNamesToIds[name];
};

const updateProject = async (crowdinToken, spec) => {
  const {
    projectsGroupsApi,
  } = await crowdinClient(crowdinToken);

  const {
    'glossary-access': glossaryAccess = true,
    'translate-duplicates': translateDuplicates = 5,
    description,
  } = spec;


  const projectId = await getProjectId(crowdinToken, spec);

  await projectsGroupsApi.editProject(
    projectId,
    [
      { op: 'replace', path: '/description', value: description },
      { op: 'replace', path: '/translateDuplicates', value: translateDuplicates },
      { op: 'replace', path: '/glossaryAccess', value: glossaryAccess },
      // not supported in Enterprise API yet
      // { op: 'replace', path: '/targetLanguageIds', value: targetLanguageIds }
    ],
  );
};

const handleProject = async (crowdinToken, spec) => {
  const {
    projectsGroupsApi,
  } = await crowdinClient(crowdinToken);

  const projectNames = (await projectsGroupsApi.listProjects())
    .data.map((project) => project.data.name);

  if (projectNames.includes(spec.name)) {
    await updateProject(crowdinToken, spec)
      .catch((error) => {
        throw new Error(`Could not update a project: ${error}`);
      });
  } else {
    await createProject(crowdinToken, spec)
      .catch((error) => {
        throw new Error(`Could not create a project ${error}`);
      });
  }
};

module.exports = {
  handleProject,
  getProjectId,
};
