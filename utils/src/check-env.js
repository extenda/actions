const checkEnv = (variables) => {
  variables.every((name) => {
    if (!process.env[name]) {
      throw new Error(`Missing env var: ${name}`);
    }
  });
};

module.exports = {
  checkEnv,
};
