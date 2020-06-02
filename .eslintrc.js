const os = require('os');
const endLineStyle = os.platform() === 'win32'
  ? 'windows'
  : 'unix';
console.log(os.platform());
console.log(os.EOL);
console.log(process.platform);
module.exports = {
  "env": {
    "es6": true,
    "jest": true,
    "node": true
  },
  "extends": "airbnb-base",
  "globals": {
    "Atomics": "readonly",
    "SharedArrayBuffer": "readonly"
  },
  "parserOptions": {
    "ecmaVersion": 2018
  },
  "rules": {
    "import/prefer-default-export": 0,
    "import/no-extraneous-dependencies": 0,
    "no-restricted-syntax": 0,
    "linebreak-style": ["error", endLineStyle]
  }
};
