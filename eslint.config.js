const js = require('@eslint/js');
const eslintPluginPrettier = require('eslint-plugin-prettier/recommended');
const simpleImportSort = require('eslint-plugin-simple-import-sort');
const globals = require('globals');

module.exports = [
  js.configs.recommended,
  {
    name: 'project-config',
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'import/prefer-default-export': 'off',
      'import/no-extraneous-dependencies': 'off',
      'no-restricted-syntax': 'off',
    },
  },
  eslintPluginPrettier,
];
