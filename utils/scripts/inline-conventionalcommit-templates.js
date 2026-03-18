// Script that inlines handlebar templates in conventional commits. This helps NCC handle the
// external files which otherwise are loaded numerous times and causing non-reproducible builds.
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);

const inlineTemplate = (source, moduleDir, template, replaceTextFn) => {
  const value = fs.readFileSync(
    path.resolve(moduleDir, 'templates', template),
    'utf-8',
  );
  return source.replace(replaceTextFn(template), JSON.stringify(value));
};

const inlineTemplates = (module, sourceFileName, replaceTextFn) => {
  const sourceFile = require.resolve(`${module}/${sourceFileName}`);
  const moduleDir = path.dirname(sourceFile);
  let source = fs.readFileSync(sourceFile, 'utf-8');
  console.log('Inline handlebars in', sourceFile);
  source = inlineTemplate(source, moduleDir, 'template.hbs', replaceTextFn);
  source = inlineTemplate(source, moduleDir, 'header.hbs', replaceTextFn);
  source = inlineTemplate(source, moduleDir, 'commit.hbs', replaceTextFn);
  source = inlineTemplate(source, moduleDir, 'footer.hbs', replaceTextFn);
  fs.writeFileSync(sourceFile, source, 'utf-8');
};

inlineTemplates(
  'conventional-changelog-conventionalcommits',
  'writer-opts.js',
  (template) =>
    `readFile(resolve(__dirname, './templates/${template}'), 'utf-8')`,
);

inlineTemplates(
  'conventional-changelog-writer',
  'index.js',
  (template) =>
    `readFileSync(join(__dirname, 'templates/${template}'), 'utf-8')`,
);
