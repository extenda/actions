import { execGcloud } from '../../setup-gcloud/src/index.js';

const isGoogleRegistry = (registry) =>
  registry.endsWith('.gcr.io') || registry.endsWith('-docker.pkg.dev');

export default async function authenticateDocker(image) {
  const [registry] = image.split('/');
  if (!isGoogleRegistry(registry)) {
    return null;
  }
  return execGcloud(['auth', 'configure-docker', registry, '--quiet']);
}
