/**
 * Dispara o workflow GitHub Actions que processa jobs de export (process-export-jobs.yml).
 * Espelha a lógica de triggerExportJobRunner em studio-server.ts para teste local.
 *
 * Uso:
 *   GITHUB_TOKEN=ghp_xxx npm run dispatch:export-workflow
 *
 * Opcionais (defaults alinhados ao repo):
 *   EXPORT_WORKFLOW_OWNER, EXPORT_WORKFLOW_REPO, EXPORT_WORKFLOW_FILE, EXPORT_WORKFLOW_REF
 *   EXPORT_DISPATCH_PROJECT_ID, EXPORT_DISPATCH_JOB_ID → inputs do workflow
 */

import process from 'node:process';

const API_VERSION = '2022-11-28';

const token = (process.env.GITHUB_TOKEN || '').trim();
const owner = (process.env.EXPORT_WORKFLOW_OWNER || 'Tburlandy').trim();
const repo = (process.env.EXPORT_WORKFLOW_REPO || 'construtor-de-site').trim();
const workflowFile = (process.env.EXPORT_WORKFLOW_FILE || 'process-export-jobs.yml').trim();
const ref = (process.env.EXPORT_WORKFLOW_REF || 'main').trim();
const projectId = (process.env.EXPORT_DISPATCH_PROJECT_ID || '').trim();
const jobId = (process.env.EXPORT_DISPATCH_JOB_ID || '').trim();

if (!token) {
  console.error(
    'Defina GITHUB_TOKEN. PAT classic: escopos repo + workflow. Fine-grained: repo + Actions (Write).',
  );
  process.exit(1);
}

if (!owner || !repo) {
  console.error('EXPORT_WORKFLOW_OWNER e EXPORT_WORKFLOW_REPO são obrigatórios se não houver default.');
  process.exit(1);
}

function headers() {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': API_VERSION,
    'User-Agent': 'construtor-dispatch-export-workflow',
  };
}

async function main() {
  const userRes = await fetch('https://api.github.com/user', { headers: headers() });
  if (userRes.status === 401) {
    console.error(
      'Token rejeitado (401). Crie um PAT novo no GitHub, coloque em Vercel (GITHUB_TOKEN) e exporte no shell.',
    );
    process.exit(1);
  }
  if (!userRes.ok) {
    const t = await userRes.text();
    console.error('Falha ao validar token:', userRes.status, t);
    process.exit(1);
  }

  const inputs = {};
  if (projectId) inputs.projectId = projectId;
  if (jobId) inputs.jobId = jobId;

  const body = Object.keys(inputs).length ? { ref, inputs } : { ref };

  const candidates = [workflowFile, `.github/workflows/${workflowFile}`];
  let lastError = '';

  for (const candidate of candidates) {
    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/workflows/${encodeURIComponent(candidate)}/dispatches`;
    const res = await fetch(url, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
    });

    if (res.ok) {
      console.log(`OK: workflow disparado (arquivo=${candidate}, ref=${ref}).`);
      if (Object.keys(inputs).length) {
        console.log('inputs:', inputs);
      }
      console.log('Acompanhe em: https://github.com/' + owner + '/' + repo + '/actions');
      return;
    }

    const text = await res.text();
    lastError = `${candidate}: HTTP ${res.status} ${text}`;
    if (res.status !== 404) {
      break;
    }
  }

  console.error('Falha ao disparar:', lastError);
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
