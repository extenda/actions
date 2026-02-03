const defaultRegistry = '414891016442.dkr.ecr.eu-west-1.amazonaws.com';

const getRegistryUrl = (registry) => {
  if (!registry) {
    return defaultRegistry;
  }

  return registry;
};

export { defaultRegistry, getRegistryUrl };
