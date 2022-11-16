var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// node_modules/@actions/core/lib/utils.js
var require_utils = __commonJS({
  "node_modules/@actions/core/lib/utils.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    function toCommandValue(input) {
      if (input === null || input === void 0) {
        return "";
      } else if (typeof input === "string" || input instanceof String) {
        return input;
      }
      return JSON.stringify(input);
    }
    exports2.toCommandValue = toCommandValue;
  }
});

// node_modules/@actions/core/lib/command.js
var require_command = __commonJS({
  "node_modules/@actions/core/lib/command.js"(exports2) {
    "use strict";
    var __importStar = exports2 && exports2.__importStar || function(mod) {
      if (mod && mod.__esModule)
        return mod;
      var result = {};
      if (mod != null) {
        for (var k in mod)
          if (Object.hasOwnProperty.call(mod, k))
            result[k] = mod[k];
      }
      result["default"] = mod;
      return result;
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    var os = __importStar(require("os"));
    var utils_1 = require_utils();
    function issueCommand(command, properties, message) {
      const cmd = new Command(command, properties, message);
      process.stdout.write(cmd.toString() + os.EOL);
    }
    exports2.issueCommand = issueCommand;
    function issue(name, message = "") {
      issueCommand(name, {}, message);
    }
    exports2.issue = issue;
    var CMD_STRING = "::";
    var Command = class {
      constructor(command, properties, message) {
        if (!command) {
          command = "missing.command";
        }
        this.command = command;
        this.properties = properties;
        this.message = message;
      }
      toString() {
        let cmdStr = CMD_STRING + this.command;
        if (this.properties && Object.keys(this.properties).length > 0) {
          cmdStr += " ";
          let first = true;
          for (const key in this.properties) {
            if (this.properties.hasOwnProperty(key)) {
              const val = this.properties[key];
              if (val) {
                if (first) {
                  first = false;
                } else {
                  cmdStr += ",";
                }
                cmdStr += `${key}=${escapeProperty(val)}`;
              }
            }
          }
        }
        cmdStr += `${CMD_STRING}${escapeData(this.message)}`;
        return cmdStr;
      }
    };
    function escapeData(s) {
      return utils_1.toCommandValue(s).replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
    }
    function escapeProperty(s) {
      return utils_1.toCommandValue(s).replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A").replace(/:/g, "%3A").replace(/,/g, "%2C");
    }
  }
});

// node_modules/@actions/core/lib/file-command.js
var require_file_command = __commonJS({
  "node_modules/@actions/core/lib/file-command.js"(exports2) {
    "use strict";
    var __importStar = exports2 && exports2.__importStar || function(mod) {
      if (mod && mod.__esModule)
        return mod;
      var result = {};
      if (mod != null) {
        for (var k in mod)
          if (Object.hasOwnProperty.call(mod, k))
            result[k] = mod[k];
      }
      result["default"] = mod;
      return result;
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    var fs = __importStar(require("fs"));
    var os = __importStar(require("os"));
    var utils_1 = require_utils();
    function issueCommand(command, message) {
      const filePath = process.env[`GITHUB_${command}`];
      if (!filePath) {
        throw new Error(`Unable to find environment variable for file command ${command}`);
      }
      if (!fs.existsSync(filePath)) {
        throw new Error(`Missing file at path: ${filePath}`);
      }
      fs.appendFileSync(filePath, `${utils_1.toCommandValue(message)}${os.EOL}`, {
        encoding: "utf8"
      });
    }
    exports2.issueCommand = issueCommand;
  }
});

// node_modules/@actions/core/lib/core.js
var require_core = __commonJS({
  "node_modules/@actions/core/lib/core.js"(exports2) {
    "use strict";
    var __awaiter = exports2 && exports2.__awaiter || function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    var __importStar = exports2 && exports2.__importStar || function(mod) {
      if (mod && mod.__esModule)
        return mod;
      var result = {};
      if (mod != null) {
        for (var k in mod)
          if (Object.hasOwnProperty.call(mod, k))
            result[k] = mod[k];
      }
      result["default"] = mod;
      return result;
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    var command_1 = require_command();
    var file_command_1 = require_file_command();
    var utils_1 = require_utils();
    var os = __importStar(require("os"));
    var path = __importStar(require("path"));
    var ExitCode;
    (function(ExitCode2) {
      ExitCode2[ExitCode2["Success"] = 0] = "Success";
      ExitCode2[ExitCode2["Failure"] = 1] = "Failure";
    })(ExitCode = exports2.ExitCode || (exports2.ExitCode = {}));
    function exportVariable(name, val) {
      const convertedVal = utils_1.toCommandValue(val);
      process.env[name] = convertedVal;
      const filePath = process.env["GITHUB_ENV"] || "";
      if (filePath) {
        const delimiter = "_GitHubActionsFileCommandDelimeter_";
        const commandValue = `${name}<<${delimiter}${os.EOL}${convertedVal}${os.EOL}${delimiter}`;
        file_command_1.issueCommand("ENV", commandValue);
      } else {
        command_1.issueCommand("set-env", { name }, convertedVal);
      }
    }
    exports2.exportVariable = exportVariable;
    function setSecret(secret) {
      command_1.issueCommand("add-mask", {}, secret);
    }
    exports2.setSecret = setSecret;
    function addPath(inputPath) {
      const filePath = process.env["GITHUB_PATH"] || "";
      if (filePath) {
        file_command_1.issueCommand("PATH", inputPath);
      } else {
        command_1.issueCommand("add-path", {}, inputPath);
      }
      process.env["PATH"] = `${inputPath}${path.delimiter}${process.env["PATH"]}`;
    }
    exports2.addPath = addPath;
    function getInput(name, options) {
      const val = process.env[`INPUT_${name.replace(/ /g, "_").toUpperCase()}`] || "";
      if (options && options.required && !val) {
        throw new Error(`Input required and not supplied: ${name}`);
      }
      return val.trim();
    }
    exports2.getInput = getInput;
    function setOutput(name, value) {
      command_1.issueCommand("set-output", { name }, value);
    }
    exports2.setOutput = setOutput;
    function setCommandEcho(enabled) {
      command_1.issue("echo", enabled ? "on" : "off");
    }
    exports2.setCommandEcho = setCommandEcho;
    function setFailed(message) {
      process.exitCode = ExitCode.Failure;
      error(message);
    }
    exports2.setFailed = setFailed;
    function isDebug() {
      return process.env["RUNNER_DEBUG"] === "1";
    }
    exports2.isDebug = isDebug;
    function debug(message) {
      command_1.issueCommand("debug", {}, message);
    }
    exports2.debug = debug;
    function error(message) {
      command_1.issue("error", message instanceof Error ? message.toString() : message);
    }
    exports2.error = error;
    function warning(message) {
      command_1.issue("warning", message instanceof Error ? message.toString() : message);
    }
    exports2.warning = warning;
    function info(message) {
      process.stdout.write(message + os.EOL);
    }
    exports2.info = info;
    function startGroup(name) {
      command_1.issue("group", name);
    }
    exports2.startGroup = startGroup;
    function endGroup() {
      command_1.issue("endgroup");
    }
    exports2.endGroup = endGroup;
    function group(name, fn) {
      return __awaiter(this, void 0, void 0, function* () {
        startGroup(name);
        let result;
        try {
          result = yield fn();
        } finally {
          endGroup();
        }
        return result;
      });
    }
    exports2.group = group;
    function saveState(name, value) {
      command_1.issueCommand("save-state", { name }, value);
    }
    exports2.saveState = saveState;
    function getState(name) {
      return process.env[`STATE_${name}`] || "";
    }
    exports2.getState = getState;
  }
});

// src/docker.js
var require_docker = __commonJS({
  "src/docker.js"(exports2, module2) {
    var cp = require("child_process");
    var core = require_core();
    var fs = require("fs");
    var createBuildCommand = (dockerfile, imageName, buildArgs, dockerContext, tags) => {
      let buildCommandPrefix = `docker build -f ${dockerfile}`;
      if (tags) {
        const tagsSuffix = tags.map((tag) => `-t ${imageName}:${tag}`).join(" ");
        buildCommandPrefix = `${buildCommandPrefix} ${tagsSuffix}`;
      } else {
        buildCommandPrefix = `${buildCommandPrefix} -t ${imageName}`;
      }
      if (buildArgs) {
        const argsSuffix = buildArgs.map((arg) => `--build-arg ${arg}`).join(" ");
        buildCommandPrefix = `${buildCommandPrefix} ${argsSuffix}`;
      }
      return `${buildCommandPrefix} ${dockerContext}`;
    };
    var build = (imageName, buildArgs, tags) => {
      const dockerfile = core.getInput("dockerfile");
      const dockerContext = core.getInput("docker-context", { required: false });
      if (!fs.existsSync(dockerfile)) {
        core.setFailed(`Dockerfile does not exist in location ${dockerfile}`);
      }
      const buildCmd = createBuildCommand(dockerfile, imageName, buildArgs, dockerContext, tags);
      core.info(`Building Docker image (${imageName}): ${buildCmd}`);
      cp.execSync(buildCmd);
    };
    var isEcr = (registry) => registry && registry.includes("amazonaws");
    var getRegion = (registry) => registry.substring(registry.indexOf("ecr.") + 4, registry.indexOf(".amazonaws"));
    var login = (registry) => {
      if (!registry) {
        return;
      }
      core.info("Login started");
      let username;
      let password;
      if (isEcr(registry)) {
        const region = getRegion(registry);
        username = "AWS";
        password = cp.execSync(`aws ecr get-login-password --region ${region}`);
      } else {
        username = core.getInput("username");
        password = core.getInput("password");
      }
      core.info(`Logging into Docker registry ${registry}...`);
      cp.execSync(`docker login -u ${username} --password-stdin ${registry}`, {
        input: password
      });
    };
    var push = (imageName, tags) => {
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
    module2.exports = {
      build,
      login,
      push
    };
  }
});

// src/url-helper.js
var require_url_helper = __commonJS({
  "src/url-helper.js"(exports2, module2) {
    var defaultRegistry = "414891016442.dkr.ecr.eu-west-1.amazonaws.com";
    var getRegistryUrl = (registry) => {
      if (!registry) {
        return defaultRegistry;
      }
      return registry;
    };
    module2.exports = {
      getRegistryUrl,
      defaultRegistry
    };
  }
});

// src/docker-build-push.js
var require_docker_build_push = __commonJS({
  "src/docker-build-push.js"(exports2, module2) {
    var core = require_core();
    var docker = require_docker();
    var urlhelper = require_url_helper();
    var processBuildArgsInput = (buildArgsInput) => {
      let buildArgs = null;
      if (buildArgsInput) {
        buildArgs = buildArgsInput.split(",");
      }
      return buildArgs;
    };
    var processTags = (tagsInput) => {
      let tags = null;
      if (tagsInput) {
        tags = tagsInput.split(",");
      }
      return tags;
    };
    var run2 = () => {
      try {
        const image = core.getInput("image", { required: true });
        const registryInput = core.getInput("registry", { required: false });
        const tagInput = core.getInput("tag", { required: true });
        const tags = processTags(tagInput);
        const shouldPush = core.getInput("push", { required: false });
        const buildArgs = processBuildArgsInput(core.getInput("buildArgs"));
        const registry = urlhelper.getRegistryUrl(registryInput);
        docker.login(registry);
        const imageName = `${registry}/${image}`;
        docker.build(imageName, buildArgs, tags);
        if (shouldPush === "true") {
          docker.push(imageName, tags);
        }
        core.setOutput("imageFullName", imageName);
      } catch (error) {
        core.setFailed(error.message);
      }
    };
    module2.exports = run2;
  }
});

// src/index.js
var run = require_docker_build_push();
if (require.main === module) {
  run();
}
