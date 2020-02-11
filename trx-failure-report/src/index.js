const core = require('@actions/core');
const parser = require('fast-xml-parser');
const fs = require('fs');
const glob = require('glob');
const he = require('he');

const options = {
  attributeNamePrefix: '@_',
  attrNodeName: 'attr',
  textNodeName: '#text',
  ignoreAttributes: true,
  ignoreNameSpace: false,
  allowBooleanAttributes: false,
  parseNodeValue: true,
  parseAttributeValue: false,
  trimValues: true,
  cdataTagName: '__cdata',
  cdataPositionChar: '\\c',
  parseTrueNumberOnly: false,
  arrayMode: false,
  attrValueProcessor: (val) => he.decode(val, { isAttributeValue: true }),
  tagValueProcessor: (val) => he.decode(val),
  stopNodes: ['parse-me-as-string'],
};

const summary = [];

const prettyPrint = (header, data) => {
  const indentation = 15;
  const stdPadding = ' '.repeat(indentation);
  let firstPadding;
  if (header.length > indentation - 2) {
    firstPadding = '';
  } else {
    firstPadding = ' '.repeat(indentation - header.length - 2);
  }
  const parts = data.split('\n');
  core.info(`${header}: ${firstPadding}${parts[0].trimStart()}`);
  for (let i = 1; i < parts.length; i += 1) {
    core.info(`${stdPadding}${parts[i].trimStart()}`);
  }
};

const printSummary = () => {
  const header = 'Test Failure Summary';
  core.info('#'.repeat(header.length));
  core.info(`\n${header}\n`);
  core.info('#'.repeat(header.length));
  for (let i = 0; i < summary.length; i += 1) {
    core.info(summary[i]);
  }
};

const parseFile = (trxFile) => {
  const xmlData = String(fs.readFileSync(trxFile));
  const jsonObj = parser.parse(xmlData, [options]);
  const testTypes = Object.keys(jsonObj.TestRun.TestDefinitions);
  for (let typeIndex = 0; typeIndex < testTypes.length; typeIndex += 1) {
    const testType = testTypes[typeIndex];
    const ResultEntry = `${testTypes[typeIndex]}Result`;
    const title = `Failures for ${testType}`;
    core.info(title);
    core.info('='.repeat(title.length));
    for (let i = 0; i < jsonObj.TestRun.Results[ResultEntry].length; i += 1) {
      const resultObj = jsonObj.TestRun.Results[ResultEntry][i];
      if (resultObj.Output.ErrorInfo) {
        const testDesc = jsonObj.TestRun.TestDefinitions[testType][i];
        summary.push(`${trxFile} - ${testType} -  ${testDesc.Description}`);
        prettyPrint('Test description', testDesc.Description);
        prettyPrint('StdOut', resultObj.Output.StdOut);
        prettyPrint('Message', resultObj.Output.ErrorInfo.Message);
        prettyPrint('StackTrace', resultObj.Output.ErrorInfo.StackTrace);
        core.info('-'.repeat(title.length));
      }
    }
  }
};

const run = async () => {
  glob('**/*.trx', (err, files) => {
    for (let i = 0; i < files.length; i += 1) {
      const header = `Test Failures in ${files[i]}`;
      core.info('#'.repeat(header.length));
      core.info(`\n${header}\n`);
      core.info('#'.repeat(header.length));
      parseFile(files[i]);
    }
    printSummary();
  });
};

run();
