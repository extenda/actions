const createComment = require('../src/create-comment');

test('It can create a comment for no changes', () => {
  const comment = createComment('cloud-deploy.yaml', {
    serviceName: 'checkout-service-manager-api',
    updates: false,
    vulnerabilities: false,
  });
  expect(comment).toContain('No changes');
});

test('It can create a comment for domain changes', () => {
  const comment = createComment('cloud-deploy.yaml', {
    serviceName: 'checkout-service-manager-api',
    updates: {
      timeout: 600,
      domainMappings: {
        removed: ['checkout-service-manager.retailsvc.com'],
        added: ['csm.retailsvc.com'],
      },
    },
    vulnerabilities: false,
  });
  expect(comment).toContain('domains');
});

test('It can create a comment for a new service', () => {
  const comment = createComment('cloud-deploy.yaml', {
    serviceName: 'csm-test',
    updates: {
      new: true,
      pathMappings: {
        newRoutes: [
          {
            target: 'service/hiiretail-platform-api',
            paths: ['/platform-api/health', '/platform-api/health/*'],
            rewrite: '/health',
            pathid: 1,
          },
        ],
      },
    },
    vulnerabilities: false,
  });
  expect(comment).toContain('is **new**');
});

test('It includes vulnerabilities in comment', () => {
  const comment = createComment('cloud-deploy.yaml', {
    serviceName: 'checkout-app-releases',
    updates: false,
    vulnerabilities: [
      {
        vulnerabilityid: 'CVE-2022-32207',
        severity: 'CRITICAL',
      },
      {
        vulnerabilityid: 'CVE-2022-32221',
        severity: 'CRITICAL',
      },
      {
        vulnerabilityid: 'CVE-2023-23914',
        severity: 'CRITICAL',
      },
      {
        vulnerabilityid: 'CVE-2023-38545',
        severity: 'CRITICAL',
      },
      {
        vulnerabilityid: 'CVE-2022-27404',
        severity: 'CRITICAL',
      },
      {
        vulnerabilityid: 'CVE-2022-1586',
        severity: 'CRITICAL',
      },
      {
        vulnerabilityid: 'CVE-2022-1587',
        severity: 'CRITICAL',
      },
      {
        vulnerabilityid: 'CVE-2022-37434',
        severity: 'CRITICAL',
      },
    ],
  });
  expect(comment).toContain('[CVE-2022-37434]');
});
