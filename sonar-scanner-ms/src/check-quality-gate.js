const core = require('@actions/core');
const path = require('path');
const fs = require('fs');
const readline = require('readline');
const axios = require('axios');

const REPORT_TASK_FILE = 'report-task.txt';
const PROP_TASK_URL = 'ceTaskUrl';
const PROP_SERVER_URL = 'serverUrl';

const axiosConfig = {
  auth: {
    username: process.env.SONAR_TOKEN,
    password: '',
  },
};

const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));

const findReportFile = () => {
  const reportFile = path.join('.sonarqube', 'out', '.sonar', REPORT_TASK_FILE);
  if (!fs.existsSync(reportFile)) {
    throw new Error(`Could not find ${REPORT_TASK_FILE}`);
  }
  return reportFile;
};

const getTaskReport = async (reportFile) => {
  if (!fs.existsSync(reportFile)) {
    throw new `File not found ${reportFile}`();
  }

  const reader = readline.createInterface({
    input: fs.createReadStream(reportFile),
    crlfDelay: Infinity,
  });

  const properties = {};
  for await (const line of reader) {
    const index = line.indexOf('=');
    const name = line.substring(0, index);
    const value = line.substring(index + 1);
    properties[name] = value;
  }

  if (!properties[PROP_TASK_URL]) {
    throw new Error(`Invalid report file: ${reportFile} -- missing ceTaskUrl`);
  }
  return properties;
};

const getTaskStatus = async (taskUrl) => axios.get(taskUrl, axiosConfig)
  .then((response) => {
    const { data: { task } } = response;
    return {
      analysisId: task.analysisId,
      status: task.status,
    };
  });

const getQualityGateStatus = async (serverUrl, analysisId) => axios.get(`${serverUrl}/api/qualitygates/project_status?analysisId=${analysisId}`, axiosConfig)
  .then((response) => response.data.projectStatus);

const timer = (ms) => new Promise((res) => setTimeout(res, ms));

const formatComment = (data) => {
  let string = '';
  for (let i = 0; i < data.conditions.length; i += 1) {
    const raw = data.conditions[i];
    const key = raw.metricKey.replace(/_/g, ' ');
    let line = `${raw.status} ${key}: ${raw.actualValue}`;
    if (raw.warningThreshold) {
      line += ` warning at ${raw.warningThreshold}`;
    }
    line += ` error at ${raw.errorThreshold}`;
    string += `${line} \n`;
  }
  return string;
};

const postComment = (comment) => {
  const url = `https://api.github.com/repos/extenda/${event.pull_request.head.repo.name}/issues/${event.pull_request.number}/comments`;
  const conf = {
    headers: {
      Accept: 'application/vnd.github.v3+json',
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    },
  };
  const data = { body: comment };
  axios.post(url, data, conf).then(() => { core.info('Posted QualityGate results to PR'); }).catch((error) => { core.info(error); });
};

const checkQualityGate = async (reportFile = null, sleepMs = 2000) => {
  const report = await getTaskReport(reportFile || findReportFile());
  let task = { status: 'UNKNOWN' };

  /* eslint-disable no-await-in-loop */
  while (!['CANCELLED', 'FAILED', 'SUCCESS'].includes(task.status)) {
    if (task.status !== 'UNKNOWN') {
      // eslint-disable-next-line no-await-in-loop
      await timer(sleepMs);
    }
    task = await getTaskStatus(report[PROP_TASK_URL]);
    core.info(`Status of Sonar task is ${task.status}`);
  }

  if (task.status === 'CANCELLED') {
    core.info('Sonar job is cancelled -- exit with error');
    return 504;
  } if (task.status === 'FAILED') {
    core.error('Sonar job failed -- exit with error');
    return 500;
  }

  const qgStatus = await getQualityGateStatus(report[PROP_SERVER_URL], task.analysisId);
  core.info(`Sonar Quality Gate status is ${qgStatus.status}`);
  if (event.pull_request) {
    postComment(formatComment(qgStatus));
  }
  if (qgStatus.status !== 'OK') {
    core.error('Quality gate is not OK -- exit with error');
    return 1;
  }
  return 0;
  /* eslint-enable no-await-in-loop */
};

module.exports = {
  checkQualityGate,
};
