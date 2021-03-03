const createVariables = (projectId, image, tenantName, countryCode) => {
  const tenantLowerCase = tenantName.toLowerCase();
  const namespace = ['txengine', tenantLowerCase];
  if (countryCode) {
    namespace.push(countryCode.toLowerCase());
  }

  return {
    NAMESPACE: namespace.join('-'),
    TENANT_NAME: tenantLowerCase,
    CONTAINER_IMAGE: image,
    POSTGRES_IP: `sm://${projectId}/${tenantLowerCase}_postgresql_private_address`,
    POSTGRES_USER: 'postgres',
    POSTGRES_PASSWORD: `sm://${projectId}/${tenantLowerCase}_postgresql_master_password`,
  };
};

module.exports = createVariables;
