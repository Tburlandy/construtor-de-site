import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const DEFAULT_PROJECT_ID = "default";
const DEFAULT_BASE_PATH = "/pagina/";
const DEFAULT_DOMAIN = "https://seu-dominio.com";

function normalizeProjectId(rawProjectId) {
  const value = (rawProjectId || "").trim();
  return value || DEFAULT_PROJECT_ID;
}

function normalizeBasePath(rawPath) {
  const value = (rawPath || "").trim();
  const fallback = value || DEFAULT_BASE_PATH;
  const withLeadingSlash = fallback.startsWith("/") ? fallback : `/${fallback}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

function normalizeDomain(rawDomain) {
  const value = (rawDomain || "").trim();
  if (!value) {
    return null;
  }

  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    return new URL(withProtocol).origin;
  } catch {
    return null;
  }
}

function resolveSiteRootUrl(domain, basePath) {
  if (basePath === "/") {
    return `${domain}/`;
  }
  return `${domain}${basePath}`;
}

function resolveSitemapUrl(siteRootUrl) {
  return `${siteRootUrl}sitemap.xml`;
}

async function readJsonFileIfExists(filePath) {
  try {
    const fileContent = await fs.readFile(filePath, "utf-8");
    return JSON.parse(fileContent);
  } catch (error) {
    if (
      error != null &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return null;
    }
    throw error;
  }
}

function resolveOriginFromCanonical(canonical, siteUrl) {
  if (typeof canonical !== "string" || canonical.trim().length === 0) {
    return null;
  }

  const canonicalWithSiteUrl =
    siteUrl && canonical.includes("{{siteUrl}}")
      ? canonical.replace(/\{\{siteUrl\}\}/g, siteUrl)
      : canonical;

  try {
    return new URL(canonicalWithSiteUrl).origin;
  } catch {
    return null;
  }
}

function extractSiteUrlFromContent(contentLike) {
  if (!contentLike || typeof contentLike !== "object") {
    return null;
  }

  const global = contentLike.global;
  if (!global || typeof global !== "object") {
    return null;
  }

  return typeof global.siteUrl === "string" ? global.siteUrl : null;
}

function extractCanonicalFromContent(contentLike) {
  if (!contentLike || typeof contentLike !== "object") {
    return null;
  }

  const seo = contentLike.seo;
  if (!seo || typeof seo !== "object") {
    return null;
  }

  return typeof seo.canonical === "string" ? seo.canonical : null;
}

function buildRobotsContent(sitemapUrl) {
  return `User-agent: *\nAllow: /\n\nSitemap: ${sitemapUrl}\n`;
}

function buildSitemapContent(siteRootUrl) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${siteRootUrl}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>1.0</priority>\n  </url>\n</urlset>\n`;
}

async function resolveBuildDomain(projectId) {
  const envDomain = normalizeDomain(process.env.VITE_PROJECT_DOMAIN || process.env.PROJECT_DOMAIN);
  if (envDomain) {
    return envDomain;
  }

  const seoConfig = await readJsonFileIfExists(
    path.resolve(repoRoot, "data", "projects", projectId, "seo.json"),
  );
  if (seoConfig && typeof seoConfig === "object") {
    const originFromSeo = resolveOriginFromCanonical(
      seoConfig.canonical,
      null,
    );
    if (originFromSeo) {
      return originFromSeo;
    }
  }

  const projectContentRecord = await readJsonFileIfExists(
    path.resolve(repoRoot, "data", "projects", projectId, "content.json"),
  );
  const projectContent =
    projectContentRecord &&
    typeof projectContentRecord === "object" &&
    projectContentRecord.content &&
    typeof projectContentRecord.content === "object"
      ? projectContentRecord.content
      : null;

  const projectSiteUrl = extractSiteUrlFromContent(projectContent);
  const projectCanonical = extractCanonicalFromContent(projectContent);
  const originFromProjectSiteUrl = normalizeDomain(projectSiteUrl);
  if (originFromProjectSiteUrl) {
    return originFromProjectSiteUrl;
  }
  const originFromProjectCanonical = resolveOriginFromCanonical(projectCanonical, projectSiteUrl);
  if (originFromProjectCanonical) {
    return originFromProjectCanonical;
  }

  const legacyContent = await readJsonFileIfExists(path.resolve(repoRoot, "content", "content.json"));
  const legacySiteUrl = extractSiteUrlFromContent(legacyContent);
  const legacyCanonical = extractCanonicalFromContent(legacyContent);
  const originFromLegacySiteUrl = normalizeDomain(legacySiteUrl);
  if (originFromLegacySiteUrl) {
    return originFromLegacySiteUrl;
  }
  const originFromLegacyCanonical = resolveOriginFromCanonical(legacyCanonical, legacySiteUrl);
  if (originFromLegacyCanonical) {
    return originFromLegacyCanonical;
  }

  return DEFAULT_DOMAIN;
}

async function main() {
  const projectId = normalizeProjectId(process.env.VITE_PROJECT_ID || process.env.PROJECT_ID);
  const basePath = normalizeBasePath(
    process.env.VITE_PROJECT_BASE_PATH || process.env.PROJECT_BASE_PATH || process.env.BASE_PATH,
  );
  const domain = await resolveBuildDomain(projectId);
  const siteRootUrl = resolveSiteRootUrl(domain, basePath);
  const sitemapUrl = resolveSitemapUrl(siteRootUrl);

  const distPath = path.resolve(repoRoot, "dist");
  await fs.mkdir(distPath, { recursive: true });
  await fs.writeFile(path.join(distPath, "robots.txt"), buildRobotsContent(sitemapUrl), "utf-8");
  await fs.writeFile(path.join(distPath, "sitemap.xml"), buildSitemapContent(siteRootUrl), "utf-8");

  console.log(
    `[seo-artifacts] Generated dist/robots.txt and dist/sitemap.xml for projectId="${projectId}" basePath="${basePath}" domain="${domain}"`,
  );
}

main().catch((error) => {
  console.error("[seo-artifacts] Failed to generate SEO artifacts:", error);
  process.exitCode = 1;
});
