export default {
  credentials: async () => ({
    githubToken: 'github',
    sonarToken: 'sonar',
  }),
  sonarAuth: async () => ({
    username: 'sonar',
    password: '',
  }),
};
