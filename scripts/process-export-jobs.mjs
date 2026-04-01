import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const PROJECTS_TABLE = 'studio_projects';
const CONTENTS_TABLE = 'studio_project_contents';
const SEO_TABLE = 'studio_project_seo_configs';
const EXPORT_JOBS_TABLE = 'studio_export_jobs';
const DEFAULT_BASE_PATH = '/pagina/';
const DEFAULT_DOMAIN = 'https://www.efitecsolar.com';
const EXPORTS_BUCKET = process.env.SUPABASE_EXPORTS_BUCKET || 'studio-exports';

function requiredEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Variável obrigatória ausente: ${name}`);
  }
  return value;
}

function normalizeBasePath(rawPath) {
  const trimmed = typeof rawPath === 'string' ? rawPath.trim() : '';
  if (!trimmed) {
    return DEFAULT_BASE_PATH;
  }
  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
}

function normalizeDomain(rawDomain) {
  const trimmed = typeof rawDomain === 'string' ? rawDomain.trim() : '';
  if (!trimmed) {
    return null;
  }
  try {
    return new URL(trimmed).origin;
  } catch {
    return null;
  }
}

function resolveDomainFromCanonical(canonical, siteUrl) {
  const canonicalTrimmed = typeof canonical === 'string' ? canonical.trim() : '';
  if (!canonicalTrimmed) {
    return null;
  }

  try {
    return new URL(canonicalTrimmed).origin;
  } catch {
    // noop
  }

  const normalizedSiteUrl = normalizeDomain(siteUrl);
  if (!normalizedSiteUrl) {
    return null;
  }
  try {
    return new URL(canonicalTrimmed, normalizedSiteUrl).origin;
  } catch {
    return null;
  }
}

function formatTimestamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

async function runCommand(command, args, options = {}) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(stderr.trim() || `Comando falhou: ${command} ${args.join(' ')}`));
    });
  });
}

function getErrorMessage(error) {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim().slice(0, 3500);
  }
  return 'Falha ao processar exportação.';
}

async function ensureBucket(supabase) {
  const { error } = await supabase.storage.createBucket(EXPORTS_BUCKET, {
    public: false,
    fileSizeLimit: '200MB',
  });
  if (!error) {
    return;
  }
  const lowerMessage = error.message.toLowerCase();
  if (
    error.statusCode === '409' ||
    lowerMessage.includes('already exists') ||
    lowerMessage.includes('duplicate')
  ) {
    return;
  }
  throw error;
}

async function claimQueuedJob(supabase) {
  const forcedJobId = process.env.EXPORT_JOB_ID?.trim();
  if (forcedJobId) {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from(EXPORT_JOBS_TABLE)
      .update({
        status: 'running',
        started_at: now,
        updated_at: now,
      })
      .eq('job_id', forcedJobId)
      .eq('status', 'queued')
      .select('*')
      .maybeSingle();
    if (error) {
      throw error;
    }
    return data;
  }

  const { data: queued, error: queuedError } = await supabase
    .from(EXPORT_JOBS_TABLE)
    .select('*')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (queuedError) {
    throw queuedError;
  }
  if (!queued) {
    return null;
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from(EXPORT_JOBS_TABLE)
    .update({
      status: 'running',
      started_at: now,
      updated_at: now,
    })
    .eq('job_id', queued.job_id)
    .eq('status', 'queued')
    .select('*')
    .maybeSingle();
  if (error) {
    throw error;
  }
  return data;
}

async function loadProjectContent(supabase, projectId) {
  const { data } = await supabase
    .from(CONTENTS_TABLE)
    .select('content')
    .eq('project_id', projectId)
    .maybeSingle();
  if (data && data.content && typeof data.content === 'object') {
    return data.content;
  }
  const fallbackPath = path.join(repoRoot, 'content', 'content.json');
  const raw = await fs.readFile(fallbackPath, 'utf-8');
  return JSON.parse(raw);
}

async function loadProjectDomain(supabase, projectId, content) {
  const envDomain = normalizeDomain(process.env.VITE_PROJECT_DOMAIN || process.env.PROJECT_DOMAIN);
  if (envDomain) {
    return envDomain;
  }

  const { data: seoData } = await supabase
    .from(SEO_TABLE)
    .select('canonical')
    .eq('project_id', projectId)
    .maybeSingle();
  const global = content && typeof content === 'object' ? content.global : null;
  const siteUrl = global && typeof global === 'object' ? global.siteUrl : null;

  const seoDomain = resolveDomainFromCanonical(seoData?.canonical, siteUrl);
  if (seoDomain) {
    return seoDomain;
  }

  const contentSeo = content && typeof content === 'object' ? content.seo : null;
  const contentCanonical = contentSeo && typeof contentSeo === 'object' ? contentSeo.canonical : null;
  const siteUrlDomain = normalizeDomain(siteUrl);
  if (siteUrlDomain) {
    return siteUrlDomain;
  }
  const canonicalDomain = resolveDomainFromCanonical(contentCanonical, siteUrl);
  if (canonicalDomain) {
    return canonicalDomain;
  }

  return DEFAULT_DOMAIN;
}

async function markJobFailed(supabase, jobId, error) {
  const now = new Date().toISOString();
  await supabase
    .from(EXPORT_JOBS_TABLE)
    .update({
      status: 'failed',
      finished_at: now,
      updated_at: now,
      error_message: getErrorMessage(error),
    })
    .eq('job_id', jobId);
}

async function markJobSuccess(supabase, jobId, payload) {
  const now = new Date().toISOString();
  await supabase
    .from(EXPORT_JOBS_TABLE)
    .update({
      status: 'success',
      finished_at: now,
      updated_at: now,
      artifact_file_name: payload.artifactFileName,
      artifact_storage_path: payload.artifactStoragePath,
      artifact_size_bytes: payload.artifactSizeBytes,
      error_message: null,
    })
    .eq('job_id', jobId);
}

async function processJob(supabase, job) {
  const projectId = String(job.project_id);
  const contentPath = path.join(repoRoot, 'content', 'content.json');
  const originalContent = await fs.readFile(contentPath, 'utf-8');
  const projectContent = await loadProjectContent(supabase, projectId);
  await fs.writeFile(contentPath, `${JSON.stringify(projectContent, null, 2)}\n`, 'utf-8');

  const global = projectContent && typeof projectContent === 'object' ? projectContent.global : null;
  const configuredBasePath =
    global && typeof global === 'object' && typeof global.buildBasePath === 'string'
      ? global.buildBasePath
      : undefined;
  const basePath = normalizeBasePath(configuredBasePath);
  const domain = await loadProjectDomain(supabase, projectId, projectContent);

  const env = {
    ...process.env,
    PROJECT_ID: projectId,
    VITE_PROJECT_ID: projectId,
    PROJECT_BASE_PATH: basePath,
    VITE_PROJECT_BASE_PATH: basePath,
    PROJECT_DOMAIN: domain,
    VITE_PROJECT_DOMAIN: domain,
    VITE_STUDIO_ENABLED: 'false',
  };

  const tempRoot = path.join(repoRoot, '.tmp', 'exports');
  const timestamp = formatTimestamp(new Date());
  const fileName = `${projectId}-${timestamp}.zip`;
  const zipAbsolutePath = path.join(tempRoot, fileName);
  const storagePath = `clients/${projectId}/${fileName}`;

  await fs.mkdir(tempRoot, { recursive: true });
  await fs.rm(path.join(repoRoot, 'dist'), { recursive: true, force: true });

  try {
    await runCommand('npm', ['run', 'build'], { cwd: repoRoot, env });
    await runCommand('zip', ['-rq', zipAbsolutePath, '.'], {
      cwd: path.join(repoRoot, 'dist'),
      env,
    });

    const zipBuffer = await fs.readFile(zipAbsolutePath);
    const { error: uploadError } = await supabase.storage
      .from(EXPORTS_BUCKET)
      .upload(storagePath, zipBuffer, {
        upsert: true,
        contentType: 'application/zip',
        cacheControl: '3600',
      });
    if (uploadError) {
      throw uploadError;
    }

    const stat = await fs.stat(zipAbsolutePath);
    await markJobSuccess(supabase, String(job.job_id), {
      artifactFileName: fileName,
      artifactStoragePath: storagePath,
      artifactSizeBytes: stat.size,
    });
  } finally {
    await fs.writeFile(contentPath, originalContent, 'utf-8');
    await fs.rm(zipAbsolutePath, { force: true });
  }
}

async function ensureProjectExists(supabase, projectId) {
  const { data, error } = await supabase
    .from(PROJECTS_TABLE)
    .select('project_id')
    .eq('project_id', projectId)
    .maybeSingle();
  if (error) {
    throw error;
  }
  if (!data) {
    throw new Error(`Projeto não encontrado para exportação: ${projectId}`);
  }
}

async function main() {
  const supabaseUrl = requiredEnv('SUPABASE_URL');
  const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  await ensureBucket(supabase);
  const job = await claimQueuedJob(supabase);
  if (!job) {
    console.log('[export-jobs] Nenhum job pendente.');
    return;
  }

  const projectId = String(job.project_id);
  console.log(`[export-jobs] Processando job ${job.job_id} para projeto ${projectId}`);
  try {
    await ensureProjectExists(supabase, projectId);
    await processJob(supabase, job);
    console.log(`[export-jobs] Job ${job.job_id} finalizado com sucesso.`);
  } catch (error) {
    console.error(`[export-jobs] Falha no job ${job.job_id}:`, error);
    await markJobFailed(supabase, String(job.job_id), error);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('[export-jobs] Falha inesperada:', error);
  process.exitCode = 1;
});

