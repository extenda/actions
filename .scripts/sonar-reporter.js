const reporter = require('jest-sonar-reporter');
const fs = require('fs');

module.exports = (results) => {
  const testSuite = results.testResults[0].displayName;
  const report = reporter(results);
  fs.renameSync('test-report.xml', `test-results/SONAR-${testSuite}.xml`);
  return report;
};
