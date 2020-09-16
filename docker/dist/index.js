module.exports =
/******/ (function(modules, runtime) { // webpackBootstrap
/******/ 	"use strict";
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete installedModules[moduleId];
/******/ 		}
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	__webpack_require__.ab = __dirname + "/";
/******/
/******/ 	// the startup function
/******/ 	function startup() {
/******/ 		// Load entry module and return exports
/******/ 		return __webpack_require__(76);
/******/ 	};
/******/
/******/ 	// run startup
/******/ 	return startup();
/******/ })
/************************************************************************/
/******/ ({

/***/ 76:
/***/ (function(__unusedmodule, __unusedexports, __webpack_require__) {

const run = __webpack_require__(805);

if (require.main === require.cache[eval('__filename')]) {
  run();
}


/***/ }),

/***/ 87:
/***/ (function(module) {

module.exports = require("os");

/***/ }),

/***/ 129:
/***/ (function(module) {

module.exports = require("child_process");

/***/ }),

/***/ 300:
/***/ (function(module) {

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

/***/ 489:
/***/ (function(__unusedmodule, exports, __webpack_require__) {

"use strict";

var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const os = __importStar(__webpack_require__(87));
/**
 * Commands
 *
 * Command Format:
 *   ::name key=value,key=value::message
 *
 * Examples:
 *   ::warning::This is the message
 *   ::set-env name=MY_VAR::some value
 */
function issueCommand(command, properties, message) {
    const cmd = new Command(command, properties, message);
    process.stdout.write(cmd.toString() + os.EOL);
}
exports.issueCommand = issueCommand;
function issue(name, message = '') {
    issueCommand(name, {}, message);
}
exports.issue = issue;
const CMD_STRING = '::';
class Command {
    constructor(command, properties, message) {
        if (!command) {
            command = 'missing.command';
        }
        this.command = command;
        this.properties = properties;
        this.message = message;
    }
    toString() {
        let cmdStr = CMD_STRING + this.command;
        if (this.properties && Object.keys(this.properties).length > 0) {
            cmdStr += ' ';
            let first = true;
            for (const key in this.properties) {
                if (this.properties.hasOwnProperty(key)) {
                    const val = this.properties[key];
                    if (val) {
                        if (first) {
                            first = false;
                        }
                        else {
                            cmdStr += ',';
                        }
                        cmdStr += `${key}=${escapeProperty(val)}`;
                    }
                }
            }
        }
        cmdStr += `${CMD_STRING}${escapeData(this.message)}`;
        return cmdStr;
    }
}
function escapeData(s) {
    return (s || '')
        .replace(/%/g, '%25')
        .replace(/\r/g, '%0D')
        .replace(/\n/g, '%0A');
}
function escapeProperty(s) {
    return (s || '')
        .replace(/%/g, '%25')
        .replace(/\r/g, '%0D')
        .replace(/\n/g, '%0A')
        .replace(/:/g, '%3A')
        .replace(/,/g, '%2C');
}
//# sourceMappingURL=command.js.map

/***/ }),

/***/ 622:
/***/ (function(module) {

module.exports = require("path");

/***/ }),

/***/ 686:
/***/ (function(module, __unusedexports, __webpack_require__) {

const cp = __webpack_require__(129);
const core = __webpack_require__(793);
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

/***/ 747:
/***/ (function(module) {

module.exports = require("fs");

/***/ }),

/***/ 793:
/***/ (function(__unusedmodule, exports, __webpack_require__) {

"use strict";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const command_1 = __webpack_require__(489);
const os = __importStar(__webpack_require__(87));
const path = __importStar(__webpack_require__(622));
/**
 * The code to exit an action
 */
var ExitCode;
(function (ExitCode) {
    /**
     * A code indicating that the action was successful
     */
    ExitCode[ExitCode["Success"] = 0] = "Success";
    /**
     * A code indicating that the action was a failure
     */
    ExitCode[ExitCode["Failure"] = 1] = "Failure";
})(ExitCode = exports.ExitCode || (exports.ExitCode = {}));
//-----------------------------------------------------------------------
// Variables
//-----------------------------------------------------------------------
/**
 * Sets env variable for this action and future actions in the job
 * @param name the name of the variable to set
 * @param val the value of the variable
 */
function exportVariable(name, val) {
    process.env[name] = val;
    command_1.issueCommand('set-env', { name }, val);
}
exports.exportVariable = exportVariable;
/**
 * Registers a secret which will get masked from logs
 * @param secret value of the secret
 */
function setSecret(secret) {
    command_1.issueCommand('add-mask', {}, secret);
}
exports.setSecret = setSecret;
/**
 * Prepends inputPath to the PATH (for this action and future actions)
 * @param inputPath
 */
function addPath(inputPath) {
    command_1.issueCommand('add-path', {}, inputPath);
    process.env['PATH'] = `${inputPath}${path.delimiter}${process.env['PATH']}`;
}
exports.addPath = addPath;
/**
 * Gets the value of an input.  The value is also trimmed.
 *
 * @param     name     name of the input to get
 * @param     options  optional. See InputOptions.
 * @returns   string
 */
function getInput(name, options) {
    const val = process.env[`INPUT_${name.replace(/ /g, '_').toUpperCase()}`] || '';
    if (options && options.required && !val) {
        throw new Error(`Input required and not supplied: ${name}`);
    }
    return val.trim();
}
exports.getInput = getInput;
/**
 * Sets the value of an output.
 *
 * @param     name     name of the output to set
 * @param     value    value to store
 */
function setOutput(name, value) {
    command_1.issueCommand('set-output', { name }, value);
}
exports.setOutput = setOutput;
//-----------------------------------------------------------------------
// Results
//-----------------------------------------------------------------------
/**
 * Sets the action status to failed.
 * When the action exits it will be with an exit code of 1
 * @param message add error issue message
 */
function setFailed(message) {
    process.exitCode = ExitCode.Failure;
    error(message);
}
exports.setFailed = setFailed;
//-----------------------------------------------------------------------
// Logging Commands
//-----------------------------------------------------------------------
/**
 * Writes debug message to user log
 * @param message debug message
 */
function debug(message) {
    command_1.issueCommand('debug', {}, message);
}
exports.debug = debug;
/**
 * Adds an error issue
 * @param message error issue message
 */
function error(message) {
    command_1.issue('error', message);
}
exports.error = error;
/**
 * Adds an warning issue
 * @param message warning issue message
 */
function warning(message) {
    command_1.issue('warning', message);
}
exports.warning = warning;
/**
 * Writes info to log with console.log.
 * @param message info message
 */
function info(message) {
    process.stdout.write(message + os.EOL);
}
exports.info = info;
/**
 * Begin an output group.
 *
 * Output until the next `groupEnd` will be foldable in this group
 *
 * @param name The name of the output group
 */
function startGroup(name) {
    command_1.issue('group', name);
}
exports.startGroup = startGroup;
/**
 * End an output group.
 */
function endGroup() {
    command_1.issue('endgroup');
}
exports.endGroup = endGroup;
/**
 * Wrap an asynchronous function call in a group.
 *
 * Returns the same type as the function itself.
 *
 * @param name The name of the group
 * @param fn The function to wrap in the group
 */
function group(name, fn) {
    return __awaiter(this, void 0, void 0, function* () {
        startGroup(name);
        let result;
        try {
            result = yield fn();
        }
        finally {
            endGroup();
        }
        return result;
    });
}
exports.group = group;
//-----------------------------------------------------------------------
// Wrapper action state
//-----------------------------------------------------------------------
/**
 * Saves state for current action, the state can only be retrieved by this action's post job execution.
 *
 * @param     name     name of the state to store
 * @param     value    value to store
 */
function saveState(name, value) {
    command_1.issueCommand('save-state', { name }, value);
}
exports.saveState = saveState;
/**
 * Gets the value of an state set by this action's main execution.
 *
 * @param     name     name of the state to get
 * @returns   string
 */
function getState(name) {
    return process.env[`STATE_${name}`] || '';
}
exports.getState = getState;
//# sourceMappingURL=core.js.map

/***/ }),

/***/ 805:
/***/ (function(module, __unusedexports, __webpack_require__) {

const core = __webpack_require__(793);
const docker = __webpack_require__(686);
const urlhelper = __webpack_require__(300);

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


/***/ })

/******/ });