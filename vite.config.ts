import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { studioPlugin } from "./vite-plugin-studio";

const DEFAULT_BASE_PATH = "/pagina/";
const DEFAULT_PROJECT_ID = "default";

function normalizeBasePath(rawPath: string | undefined): string {
  const trimmed = rawPath?.trim();
  if (!trimmed) {
    return DEFAULT_BASE_PATH;
  }

  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

function resolveProjectBasePath(mode: string, env: Record<string, string>): string {
  if (mode === "development") {
    return "/";
  }

  const explicitFromShell =
    process.env.VITE_PROJECT_BASE_PATH || process.env.PROJECT_BASE_PATH || process.env.BASE_PATH;
  if (explicitFromShell?.trim()) {
    if (explicitFromShell.trim() === "/") {
      return "/";
    }
    return normalizeBasePath(explicitFromShell);
  }

  const configuredPath = env.VITE_PROJECT_BASE_PATH || env.PROJECT_BASE_PATH || env.BASE_PATH;
  if (!configuredPath) {
    return DEFAULT_BASE_PATH;
  }
  if (configuredPath.trim() === "/") {
    return "/";
  }

  return normalizeBasePath(configuredPath);
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const projectId = (env.VITE_PROJECT_ID || env.PROJECT_ID || DEFAULT_PROJECT_ID).trim();
  const studioEnabled = mode === 'development' || env.VITE_STUDIO_ENABLED === 'true';
  const projectBasePath = resolveProjectBasePath(mode, env);
  const projectDomain = (env.VITE_PROJECT_DOMAIN || env.PROJECT_DOMAIN || "").trim();

  return {
    base: projectBasePath,
    server: {
      host: "::",
      port: 8084,
      cors: true,
      allowedHosts: [
        "cd94fbbe0aed.ngrok-free.app",
        ".ngrok-free.app",
        ".ngrok.io",
      ],
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      mode === "development" && studioPlugin({ env }),
    ].filter(Boolean),
    define: {
      __STUDIO_ENABLED__: JSON.stringify(studioEnabled),
      __PROJECT_BUILD_CONFIG__: JSON.stringify({
        projectId,
        basePath: projectBasePath,
        domain: projectDomain || null,
      }),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    publicDir: "public",
  };
});
