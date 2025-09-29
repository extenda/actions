const { execGcloud } = require("../../setup-gcloud/src");

const uploadToBucket = async (file, bucket) => {
    const gcloudArgs = [
        'storage',
        'cp',
        file,
        bucket,
    ];

    return await execGcloud(gcloudArgs);
}

module.exports = uploadToBucket;
