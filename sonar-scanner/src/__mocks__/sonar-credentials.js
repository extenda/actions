module.exports = {
  credentials: async () => ({
    githubToken: 'github',
    sonarToken: 'sonar',
  }),
  sonarAuth: async () => ({
    username: 'sonar',
    password: '',
  }),
};
