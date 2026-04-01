import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';

const DEFAULT_BASE_PATH = '/pagina/';
const DEFAULT_PROJECT_ID = 'default';

function normalizeBasePath(rawPath) {
  const trimmed = rawPath?.trim();
  if (!trimmed) {
    return DEFAULT_BASE_PATH;
  }
  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const projectId = (env.VITE_PROJECT_ID || env.PROJECT_ID || DEFAULT_PROJECT_ID).trim();
  const projectBasePath = normalizeBasePath(
    env.VITE_PROJECT_BASE_PATH || env.PROJECT_BASE_PATH || env.BASE_PATH,
  );
  const projectDomain = (env.VITE_PROJECT_DOMAIN || env.PROJECT_DOMAIN || '').trim();

  return {
    base: projectBasePath,
    define: {
      __STUDIO_ENABLED__: JSON.stringify(false),
      __PROJECT_BUILD_CONFIG__: JSON.stringify({
        projectId,
        basePath: projectBasePath,
        domain: projectDomain || null,
      }),
    },
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), './src'),
      },
    },
    publicDir: 'public',
  };
});

