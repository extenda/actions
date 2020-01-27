const {
//   parseNugetSourceJson,
//   setNuGetApiKey,
//   setNuGetSource,
//   commentOutSourceUrl,
  generateRegexPattern,
} = require('../src/nuget-sources');

describe('Setup Nuget Sources tests', () => {
//   beforeAll(() => {
//     fsExtra.mkdirs(outputDir);
//   });
//   afterAll(() => {
//     fsExtra.removeSync(outputDir);
//   });

  test('Generate match pattern for URL', async () => {
    const url = 'https://repo.extendaretail.com/repository/nuget-group/';
    // const pattern =
    // /^\s*(.*\"https:\/\/repo.extendaretail.com\/repository\/nuget-group\/?\"\s*\/>)$
    const pattern = /^\s*(.*"https:\/\/repo.extendaretail.com\/repository\/nuget-group\/?"\s*\/>)$/;
    // expect(generateRegexPattern('https://repo.extendaretail.com/repository/nuget-group/')).toEqual('<!--https://repo.extendaretail.com/repository/nuget-group/-->');
  });
});
