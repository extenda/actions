module.exports =
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 58:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const core = __webpack_require__(994);
const docker = __webpack_require__(691);
const urlhelper = __webpack_require__(945);

const processBuildArgsInput = (buildArgsInput) => {
  let buildArgs = null;
  if (buildArgsInput) {
    buildArgs = buildArgsInput.split(',');
  }

  return buildArgs;
};

const processTags = (tagsInput) => {
  let tags = null;
  if (tagsInput) {
    tags = tagsInput.split(',');
  }

  return tags;
};

const run = () => {
  try {
    const image = core.getInput('image', { required: true });
    const registryInput = core.getInput('registry', { required: false });
    const tagInput = core.getInput('tag', { required: true });
    const tags = processTags(tagInput);
    const shouldPush = core.getInput('push', { required: false });
    const buildArgs = processBuildArgsInput(core.getInput('buildArgs'));

    const registry = urlhelper.getRegistryUrl(registryInput);
    docker.login(registry);


    const imageName = `${registry}/${image}`; // :${tag}
    docker.build(imageName, buildArgs, tags);

    if (shouldPush === 'true') {
      docker.push(imageName, tags);
    }

    core.setOutput('imageFullName', imageName);
  } catch (error) {
    core.setFailed(error.message);
  }
};

module.exports = run;


/***/ }),

/***/ 691:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const cp = __webpack_require__(129);
const core = __webpack_require__(994);
const fs = __webpack_require__(747);

const createBuildCommand = (dockerfile, imageName, buildArgs, dockerContext, tags) => {
  let buildCommandPrefix = `docker build -f ${dockerfile}`;

  if (tags) {
    const tagsSuffix = tags.map((tag) => `-t ${imageName}:${tag}`).join(' ');
    buildCommandPrefix = `${buildCommandPrefix} ${tagsSuffix}`;
  } else {
    buildCommandPrefix = `${buildCommandPrefix} -t ${imageName}`;
  }

  if (buildArgs) {
    const argsSuffix = buildArgs.map((arg) => `--build-arg ${arg}`).join(' ');
    buildCommandPrefix = `${buildCommandPrefix} ${argsSuffix}`;
  }

  return `${buildCommandPrefix} ${dockerContext}`;
};

const build = (imageName, buildArgs, tags) => {
  const dockerfile = core.getInput('dockerfile');
  const dockerContext = core.getInput('docker-context', { required: false });

  if (!fs.existsSync(dockerfile)) {
    core.setFailed(`Dockerfile does not exist in location ${dockerfile}`);
  }

  const buildCmd = createBuildCommand(dockerfile, imageName, buildArgs, dockerContext, tags);
  core.info(`Building Docker image (${imageName}): ${buildCmd}`);
  cp.execSync(buildCmd);
};

const isEcr = (registry) => registry && registry.includes('amazonaws');

const getRegion = (registry) => registry.substring(registry.indexOf('ecr.') + 4, registry.indexOf('.amazonaws'));

const login = (registry) => {
  if (!registry) {
    return;
  }

  core.info('Login started');
  // If using ECR, use the AWS CLI login command in favor of docker login
  if (isEcr(registry)) {
    const region = getRegion(registry);
    core.info(`Logging into ECR region ${region}...`);
    cp.execSync(`$(aws ecr get-login --region ${region} --no-include-email)`);
    return;
  }

  const username = core.getInput('username');
  const password = core.getInput('password');

  core.info(`Logging into Docker registry ${registry}...`);
  cp.execSync(`docker login -u ${username} --password-stdin ${registry}`, {
    input: password,
  });
};

const push = (imageName, tags) => {
  if (!tags) {
    core.info(`Pushing Docker image ${imageName} without tags`);
    cp.execSync(`docker push ${imageName}`);
    return;
  }

  tags.forEach((tag) => {
    core.info(`Pushing Docker image ${imageName}:${tag}`);
    cp.execSync(`docker push ${imageName}:${tag}`);
  });
};

module.exports = {
  build,
  login,
  push,
};


/***/ }),

/***/ 571:
/***/ ((__unused_webpack_module, __unused_webpack_exports, __webpack_require__) => {

const run = __webpack_require__(58);

if (require.main === require.cache[eval('__filename')]) {
  run();
}


/***/ }),

/***/ 945:
/***/ ((module) => {

const defaultRegistry = '414891016442.dkr.ecr.eu-west-1.amazonaws.com';

const getRegistryUrl = (registry) => {
  if (!registry) {
    return defaultRegistry;
  }

  return registry;
};

module.exports = {
  getRegistryUrl,
  defaultRegistry,
};


/***/ }),

/***/ 994:
/***/ ((module) => {

module.exports = eval("require")("@actions/core");


/***/ }),

/***/ 129:
/***/ ((module) => {

"use strict";
module.exports = require("child_process");

/***/ }),

/***/ 747:
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		if(__webpack_module_cache__[moduleId]) {
/******/ 			return __webpack_module_cache__[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	__webpack_require__.ab = __dirname + "/";/************************************************************************/
/******/ 	// module exports must be returned from runtime so entry inlining is disabled
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(571);
/******/ })()
;