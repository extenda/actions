const getDasWorkerBaseUrl = (systemId) => {
  // staging IAM systems are updated by staging iam-das-worker
  if (systemId.startsWith('iam.') && systemId.endsWith('-staging')) {
    return 'https://iam-das-worker.retailsvc.dev/api/v1';
  }

  return 'https://iam-das-worker.retailsvc.com/api/v1';
};

export default getDasWorkerBaseUrl;
