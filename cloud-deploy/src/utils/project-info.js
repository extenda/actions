const projectInfo = (projectId) => {
  const parsed = projectId.split(/^(.+)-(prod|staging)(-.*)?$/).filter(Boolean);
  return {
    project: parsed[0],
    env: parsed[1],
    suffix: parsed[2],
  };
};

export default projectInfo;
