const fs = require("fs-extra");
const path = require("path");
const { modules } = require("./modules");

const ncc = "../node_modules/.bin/esbuild";

const build = (file, out = "dist/index.js") =>
  `${ncc} ${file} --bundle --platform=node --minify --outfile=${out} --target=es2018`;

(async () => {
  modules.each((dir) => {
    fs.removeSync(path.join(dir, "dist"));
  });
  await modules.exec((dir) => {
    const commands = [build("src/index.js")];
    const { actionHooks = {} } = JSON.parse(
      fs.readFileSync(path.join(dir, "package.json"))
    );
    Object.entries(actionHooks).forEach(([key, value]) => {
      commands.push(build(value, `dist/${key}`));
    });
    return commands;
  });
})();
