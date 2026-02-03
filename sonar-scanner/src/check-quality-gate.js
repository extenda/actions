import core from '@actions/core';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

import { sonarAuth } from './sonar-credentials';

const REPORT_TASK_FILE = 'report-task.txt';
const PROP_TASK_URL = 'ceTaskUrl';
const PROP_SERVER_URL = 'serverUrl';

const findReportFile = (workingDir = '.') => {
  const paths = [
    path.join(workingDir, '.sonar'), // npm
    path.join(workingDir, '.scannerwork'), // npm 4.2.7
    path.join(workingDir, 'target', 'sonar'), // maven
    path.join(workingDir, 'build', 'sonar'), // gradle
    path.join(workingDir, '.sonarqube', 'out', '.sonar'), // dotnet
  ];
  const reportFile = paths
    .map((p) => path.join(p, REPORT_TASK_FILE))
    .find((p) => fs.existsSync(p));
  if (!reportFile) {
    throw new Error(`Could not find ${REPORT_TASK_FILE}`);
  }
  return reportFile;
};

const getTaskReport = async (reportFile) => {
  if (!fs.existsSync(reportFile)) {
    throw new Error(`File not found ${reportFile}`);
  }

  const reader = readline.createInterface({
    input: fs.createReadStream(reportFile),
    crlfDelay: Infinity,
  });

  const properties = {};
  for await (const line of reader) {
    const index = line.indexOf('=');
    const name = line.substring(0, index);
    properties[name] = line.substring(index + 1);
  }

  if (!properties[PROP_TASK_URL]) {
    throw new Error(`Invalid report file: ${reportFile} -- missing ceTaskUrl`);
  }
  return properties;
};

const getTaskStatus = async (taskUrl) =>
  axios.get(taskUrl, { auth: await sonarAuth() }).then((response) => {
    const {
      data: { task },
    } = response;
    return {
      analysisId: task.analysisId,
      status: task.status,
    };
  });

const getQualityGateStatus = async (serverUrl, analysisId) =>
  axios
    .get(
      `${serverUrl}/api/qualitygates/project_status?analysisId=${analysisId}`,
      { auth: await sonarAuth() },
    )
    .then((response) => response.data.projectStatus);

const timer = (ms) =>
  new Promise((res) => {
    setTimeout(res, ms);
  });

const result = (statusCode, report, qgStatus = null) => ({
  statusCode,
  serverUrl: report[PROP_SERVER_URL],
  qgStatus,
});

const checkQualityGate = async (
  reportFile = null,
  workingDir = '.',
  sleepMs = 2000,
) => {
  const report = await getTaskReport(reportFile || findReportFile(workingDir));
  let task = { status: 'UNKNOWN' };

  const t0 = Date.now();
  const THREE_MINUTES = 3 * 60 * 1000;
  while (!['CANCELLED', 'FAILED', 'SUCCESS'].includes(task.status)) {
    if (task.status !== 'UNKNOWN') {
      await timer(sleepMs);
    }

    if (Date.now() - t0 > THREE_MINUTES) {
      task.status = 'TIMEOUT';
      break;
    }

    task = await getTaskStatus(report[PROP_TASK_URL]);
    core.info(`Status of Sonar task is ${task.status}`);
  }

  if (task.status === 'CANCELLED') {
    core.info('Sonar job is cancelled -- exit with error');
    return result(504, report);
  }
  if (task.status === 'FAILED') {
    core.error('Sonar job failed -- exit with error');
    return result(500, report);
  }
  if (task.status === 'TIMEOUT') {
    core.warning(
      'Sonar job failed to complete within 3 minutes -- assume success',
    );
    return result(0, report);
  }

  const qgStatus = await getQualityGateStatus(
    report[PROP_SERVER_URL],
    task.analysisId,
  );
  core.info(`Sonar Quality Gate status is ${qgStatus.status}`);
  if (qgStatus.status !== 'OK') {
    core.error('Quality gate is not OK -- exit with error');
    return result(1, report, qgStatus);
  }
  return result(0, report, qgStatus);
};

module.exports = {
  checkQualityGate,
};
