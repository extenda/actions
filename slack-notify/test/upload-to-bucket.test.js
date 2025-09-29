const { execGcloud } = require("../../setup-gcloud/src");
const uploadToBucket = require("../src/upload-to-bucket");

jest.mock("../../setup-gcloud/src");

describe('uploadToBucket', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should call execGcloud with the correct storage cp arguments', async () => {
    const file = 'my-report.txt';
    const bucket = 'gs://my-cool-bucket';
    execGcloud.mockResolvedValue('File uploaded successfully.');

    await uploadToBucket(file, bucket);

    expect(execGcloud).toHaveBeenCalledTimes(1);
    expect(execGcloud).toHaveBeenCalledWith([
      'storage',
      'cp',
      file,
      bucket,
    ]);
  });

  test('should throw an error if execGcloud fails', async () => {
    const file = 'my-report.txt';
    const bucket = 'gs://my-cool-bucket';
    const errorMessage = 'Gcloud command failed';
    execGcloud.mockRejectedValue(new Error(errorMessage));

    await expect(uploadToBucket(file, bucket)).rejects.toThrow(errorMessage);
  });
});