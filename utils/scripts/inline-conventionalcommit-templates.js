// Script that inlines handlebar templates in conventional commits. This helps NCC handle the
// external files which otherwise are loaded numerous times and causing non-reproducible builds.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inlineTemplate = (source, moduleDir, template, replaceTextFn) => {
  const value = fs.readFileSync(
    path.resolve(moduleDir, 'templates', template),
    'utf-8',
  );
  return source.replace(replaceTextFn(template), JSON.stringify(value));
};

const inlineTemplates = (module, sourceFileName, replaceTextFn) => {
  const moduleDir = path.resolve(__dirname, '..', 'node_modules', module);
  const sourceFile = path.resolve(moduleDir, sourceFileName);
  let source = fs.readFileSync(sourceFile, 'utf-8');
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
