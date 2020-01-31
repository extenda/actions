// http://414891016442.dkr.ecr.eu-west-1.amazonaws.com/<registry-name>
const defaultBaseUrl = 'http://414891016442.dkr.ecr.eu-west-1.amazonaws.com/';

const getRegistryUrl = (registry) => {
  if (!registry) {
    throw Error('Registry input is null, undefined, or empty');
  }

  const reg = registry.toLowerCase();

  // const p = /^(https?:\/\/)?((([a-z\d]([a-z\d-]*[a-z\d])*)\.)+[a-z]{2,}|
  // ((\d{1,3}\.){3}\d{1,3}))(\\:\d+)?(\/[-a-z\\d%_.~+]*)*(\?[;&a-z\\d%_.~+=-]*)?
  // (\\#[-a-z\\d_]*)?$/gmi;

  const pattern = new RegExp('^(https?:\\/\\/)?' // protocol
        + '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' // domain name
        + '((\\d{1,3}\\.){3}\\d{1,3}))' // OR ip (v4) address
        + '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' // port and path
        + '(\\?[;&a-z\\d%_.~+=-]*)?' // query string
        + '(\\#[-a-z\\d_]*)?$', 'i'); // fragment locator
  if (pattern.test(reg)) {
    return registry;
  }

  const r = /^\//g;
  return `${defaultBaseUrl}${reg.replace(r, '')}`;
};

module.exports = {
  getRegistryUrl,
  defaultBaseUrl,
};
