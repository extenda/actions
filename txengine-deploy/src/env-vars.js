const createVariables = (projectId, image, tenantName, countryCode) => {
  const namespace = ['txengine', tenantName.toLowerCase()];
  if (countryCode) {
    namespace.push(countryCode.toLowerCase());
  }

  return {
    NAMESPACE: namespace.join('-'),
    TENANT_NAME: tenantName.toLowerCase(),
    CONTAINER_IMAGE: image,
    POSTGRES_IP: `sm://${projectId}/postgresql_private_address`,
    POSTGRES_USER: 'default',
    POSTGRES_PASSWORD: `sm://${projectId}/postgresql_master_password`,
  };
};

module.exports = createVariables;
